import { z } from "zod";

const googleCredentials = z.object({
  web: z.object({
    client_id: z.string(),
    project_id: z.string(),
    auth_uri: z.string(),
    token_uri: z.string(),
    auth_provider_x509_cert_url: z.string(),
    client_secret: z.string()
  })
});

export const envSchema = z.object({
  GOOGLE_CREDENTIALS: z
    .custom<string>(data => {
      try {
        if (typeof data === "string") {
          JSON.parse(data);
        }
      } catch (e) {
        return false;
      }
      return true;
    }, "invalid JSON")
    .transform(data => JSON.parse(data))
    .pipe(googleCredentials),
  HOME: z.string()
});

export type Env = z.infer<typeof envSchema>;
export const env = envSchema.parse(process.env);
