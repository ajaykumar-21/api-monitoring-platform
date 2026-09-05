import tls from "tls";
import { URL } from "url";

export interface SslCheckResult {
  isHttps: boolean;
  valid: boolean;
  daysRemaining: number | null;
  issuer: string | null;
  validFrom: string | null;
  validTo: string | null;
  protocol: string | null;
  error: string | null;
}

/**
 * Probes the SSL/TLS certificate for an HTTPS endpoint.
 */
export async function checkSslCertificate(
  urlString: string,
  timeoutMs = 5000,
): Promise<SslCheckResult> {
  try {
    const parsedUrl = new URL(urlString);

    if (parsedUrl.protocol !== "https:") {
      return {
        isHttps: false,
        valid: true,
        daysRemaining: null,
        issuer: null,
        validFrom: null,
        validTo: null,
        protocol: null,
        error: null,
      };
    }

    const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : 443;
    const hostname = parsedUrl.hostname;

    return await new Promise<SslCheckResult>((resolve) => {
      let resolved = false;

      const socket = tls.connect(
        {
          host: hostname,
          port,
          servername: hostname, // SNI support
          rejectUnauthorized: false, // We check authorization manually to extract info even if self-signed
          timeout: timeoutMs,
        },
        () => {
          if (resolved) return;
          resolved = true;

          try {
            const cert = socket.getPeerCertificate(true);
            const protocol = socket.getProtocol() || "TLS";
            const isAuthorized = socket.authorized;
            const authError = socket.authorizationError;

            socket.destroy();

            if (!cert || !cert.valid_to) {
              return resolve({
                isHttps: true,
                valid: false,
                daysRemaining: null,
                issuer: null,
                validFrom: null,
                validTo: null,
                protocol,
                error: "Could not retrieve peer certificate",
              });
            }

            const validToDate = new Date(cert.valid_to);
            const validFromDate = new Date(cert.valid_from);
            const now = new Date();

            const msRemaining = validToDate.getTime() - now.getTime();
            const daysRemaining = Math.floor(
              msRemaining / (1000 * 60 * 60 * 24),
            );
            const isExpired = daysRemaining <= 0;

            // Extract readable Issuer
            let issuerName = "Unknown";
            if (cert.issuer) {
              const oVal = Array.isArray(cert.issuer.O)
                ? cert.issuer.O.join(", ")
                : cert.issuer.O;
              const cnVal = Array.isArray(cert.issuer.CN)
                ? cert.issuer.CN.join(", ")
                : cert.issuer.CN;
              issuerName =
                oVal ||
                cnVal ||
                (typeof cert.issuer === "string"
                  ? cert.issuer
                  : JSON.stringify(cert.issuer));
            }

            const isValid = isAuthorized && !isExpired;
            let errorMsg: string | null = null;
            if (isExpired) {
              errorMsg = `SSL certificate expired ${Math.abs(daysRemaining)} days ago`;
            } else if (!isAuthorized && authError) {
              errorMsg = `SSL verification issue: ${authError.message || String(authError)}`;
            }

            resolve({
              isHttps: true,
              valid: isValid,
              daysRemaining,
              issuer: issuerName,
              validFrom: validFromDate.toISOString(),
              validTo: validToDate.toISOString(),
              protocol,
              error: errorMsg,
            });
          } catch (err: unknown) {
            const errStr = err instanceof Error ? err.message : String(err);
            resolve({
              isHttps: true,
              valid: false,
              daysRemaining: null,
              issuer: null,
              validFrom: null,
              validTo: null,
              protocol: null,
              error: errStr,
            });
          }
        },
      );

      socket.on("timeout", () => {
        if (resolved) return;
        resolved = true;
        socket.destroy();
        resolve({
          isHttps: true,
          valid: false,
          daysRemaining: null,
          issuer: null,
          validFrom: null,
          validTo: null,
          protocol: null,
          error: `TLS handshake timed out after ${timeoutMs}ms`,
        });
      });

      socket.on("error", (err) => {
        if (resolved) return;
        resolved = true;
        socket.destroy();
        resolve({
          isHttps: true,
          valid: false,
          daysRemaining: null,
          issuer: null,
          validFrom: null,
          validTo: null,
          protocol: null,
          error: err.message || "TLS connection error",
        });
      });
    });
  } catch (err: unknown) {
    const errStr = err instanceof Error ? err.message : String(err);
    return {
      isHttps: false,
      valid: false,
      daysRemaining: null,
      issuer: null,
      validFrom: null,
      validTo: null,
      protocol: null,
      error: errStr,
    };
  }
}
