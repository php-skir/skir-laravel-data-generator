import type { PhpGeneratorInput, SkirRecordLocation } from "../../src/generator.js";

const address = {
  kind: "record",
  key: "address-key",
  name: { text: "Address" },
  recordType: "struct",
  fields: [
    {
      kind: "field",
      name: { text: "city" },
      number: 0,
      type: { kind: "primitive", primitive: "string" },
    },
    {
      kind: "field",
      name: { text: "postal_codes" },
      number: 1,
      type: {
        kind: "array",
        item: { kind: "primitive", primitive: "string" },
      },
    },
  ],
  removedNumbers: [],
} as const;

const user = {
  kind: "record",
  key: "admin-user-key",
  name: { text: "User" },
  recordType: "struct",
  fields: [
    {
      kind: "field",
      name: { text: "user_id" },
      number: 0,
      type: { kind: "primitive", primitive: "int32" },
    },
    {
      kind: "field",
      name: { text: "address" },
      number: 2,
      type: {
        kind: "record",
        key: "address-key",
        recordType: "struct",
        nameParts: [{ token: { text: "Address" } }],
      },
    },
    {
      kind: "field",
      name: { text: "previous_addresses" },
      number: 3,
      type: {
        kind: "array",
        item: {
          kind: "record",
          key: "address-key",
          recordType: "struct",
          nameParts: [{ token: { text: "Address" } }],
        },
      },
    },
    {
      kind: "field",
      name: { text: "nickname" },
      number: 4,
      type: {
        kind: "optional",
        other: { kind: "primitive", primitive: "string" },
      },
    },
    {
      kind: "field",
      name: { text: "matrix" },
      number: 5,
      type: {
        kind: "array",
        item: {
          kind: "array",
          item: { kind: "primitive", primitive: "int32" },
        },
      },
    },
  ],
  removedNumbers: [1],
} as const;

const subscriptionStatus = {
  kind: "record",
  key: "subscription-status-key",
  name: { text: "SubscriptionStatus" },
  recordType: "enum",
  fields: [
    {
      kind: "field",
      name: { text: "free" },
      number: 0,
    },
    {
      kind: "field",
      name: { text: "premium_since" },
      number: 1,
      type: { kind: "primitive", primitive: "timestamp" },
    },
  ],
  removedNumbers: [],
} as const;

const addressLocation = {
  kind: "record-location",
  modulePath: "common/address.skir",
  record: address,
  recordAncestors: [address],
} as const;

const userLocation = {
  kind: "record-location",
  modulePath: "admin/users.skir",
  record: user,
  recordAncestors: [user],
} as const;

const subscriptionStatusLocation = {
  kind: "record-location",
  modulePath: "admin/users.skir",
  record: subscriptionStatus,
  recordAncestors: [subscriptionStatus],
} as const;

export const fullGeneratorInput = {
  config: { namespace: "Skir" },
  modules: [
    {
      path: "common/address.skir",
      records: [addressLocation],
    },
    {
      path: "admin/users.skir",
      records: [userLocation, subscriptionStatusLocation],
      methods: [
        {
          kind: "method",
          name: { text: "GetUser" },
          number: 1,
          requestType: {
            kind: "record",
            key: "admin-user-key",
            recordType: "struct",
            nameParts: [{ token: { text: "User" } }],
          },
          responseType: {
            kind: "record",
            key: "admin-user-key",
            recordType: "struct",
            nameParts: [{ token: { text: "User" } }],
          },
        },
        {
          kind: "method",
          name: { text: "FindUsers" },
          number: 2,
          requestType: {
            kind: "optional",
            other: { kind: "primitive", primitive: "string" },
          },
          responseType: {
            kind: "array",
            item: {
              kind: "record",
              key: "admin-user-key",
              recordType: "struct",
              nameParts: [{ token: { text: "User" } }],
            },
          },
        },
      ],
    },
  ],
  recordMap: new Map<string, SkirRecordLocation>([
    ["address-key", addressLocation],
    ["admin-user-key", userLocation],
    ["subscription-status-key", subscriptionStatusLocation],
  ]),
} satisfies PhpGeneratorInput;
