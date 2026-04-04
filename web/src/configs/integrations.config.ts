const isProd = process.env.NODE_ENV === 'production';
const baseUrl = isProd ? 'https://takda-zeta.vercel.app' : 'http://localhost:3000';

export const googleConfig = {
  web: {
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '321103490844-nkraba8da2i94bo0hd3uk5d7b3raam7n.apps.googleusercontent.com',
    project_id: "takda-492300",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    // Note: client_secret should be kept on the server. If this config is used 
    // on the client, DO NOT include the secret here.
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET, 
    redirect_uris: [
      isProd ? 'https://takda-backend.onrender.com/integrations/google/callback' : 'http://localhost:8000/integrations/google/callback'
    ],
    javascript_origins: [
      baseUrl
    ]
  }
};

export const integrationsConfig = {
  providers: [
    {
      provider_name: 'google',
      config: googleConfig
    }
  ]
};

export default integrationsConfig;
