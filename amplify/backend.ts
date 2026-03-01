import { defineAuth, defineBackend, secret } from "@aws-amplify/backend";

export const backend = defineBackend({
  auth: defineAuth({
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
  }),
});
