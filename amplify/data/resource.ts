import { a, defineData, type ClientSchema } from "@aws-amplify/backend";

const schema = a.schema({
  Condo: a.model({
    id: a.id().required(),
    condoCd: a.string().required(),
    name: a.string().required(),
    totalUnits: a.integer().required(),
    totalVotingRights: a.float().required(),
  }).authorization((allow) => [allow.publicApiKey()]),

  Unit: a
    .model({
      id: a.id().required(),
      condoId: a.id().required(),
      roomNo: a.string().required(),
      ownerName: a.string(),
      votingRights: a.float().required(),
      accessToken: a.string(),
      isVoted: a.boolean().default(false),
      votedAt: a.datetime(),
      votedSource: a.enum(["WEB", "PAPER"]),
    })
    .secondaryIndexes((index) => [index("accessToken")])
    .authorization((allow) => [allow.publicApiKey()]),

  Agenda: a.model({
    id: a.id().required(),
    condoId: a.id().required(),
    order: a.integer().required(),
    title: a.string().required(),
    resolutionType: a.enum(["ORDINARY", "SPECIAL"]),
  }).authorization((allow) => [allow.publicApiKey()]),

  Vote: a.model({
    id: a.id().required(),
    unitId: a.id().required(),
    agendaId: a.id().required(),
    choice: a.enum(["FOR", "AGAINST", "ABSTAIN"]),
    comment: a.string(),
    isProxyEntry: a.boolean().default(false),
    inputBy: a.string(),
  }).authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: { expiresInDays: 30 },
  },
});
