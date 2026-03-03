import { defineAuth, secret } from "@aws-amplify/backend";

export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret("GOOGLE_CLIENT_ID"),
        clientSecret: secret("GOOGLE_CLIENT_SECRET"),
        scopes: ["profile", "email", "openid"],
        attributeMapping: {
          email: "email",
        },
      },
      callbackUrls: [
        "http://localhost:3000/",
        "http://localhost:3000/login",
        "https://mankanteck.com/",
        "https://mankanteck.com/login",
        "https://www.mankanteck.com/",
        "https://www.mankanteck.com/login",
      ],
      logoutUrls: [
        "http://localhost:3000/",
        "https://mankanteck.com/",
        "https://www.mankanteck.com/",
      ],
    },
  },
});
