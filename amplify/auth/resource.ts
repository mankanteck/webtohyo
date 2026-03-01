import { defineAuth, secret } from "@aws-amplify/backend";

export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret("GOOGLE_CLIENT_ID"),
        clientSecret: secret("GOOGLE_CLIENT_SECRET"),
        attributeMapping: {
          email: "email",
        },
      },
      callbackUrls: [
        "http://localhost:3000/",
        "https://mankanteck.com/",
      ],
      logoutUrls: [
        "http://localhost:3000/",
        "https://mankanteck.com/",
      ],
    },
  },
  passwordPolicy: {
    minLength: 8,
    requireLowercase: false,
    requireUppercase: false,
    requireNumbers: false,
    requireSymbols: false,
  },
});
