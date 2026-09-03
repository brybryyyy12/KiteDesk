import {
  describe,
  expect,
  it,
} from "vitest";

import {
  comparePassword,
  hashPassword,
} from "../../utils/password.js";

describe(
  "password utilities",
  () => {
    it(
      "hashes a password instead of storing plain text",
      async () => {
        const password =
          "SecurePass123";

        const hash =
          await hashPassword(
            password
          );

        expect(
          hash
        ).not.toBe(
          password
        );

        expect(
          hash.length
        ).toBeGreaterThan(
          20
        );
      }
    );

    it(
      "accepts the correct password",
      async () => {
        const password =
          "SecurePass123";

        const hash =
          await hashPassword(
            password
          );

        const matches =
          await comparePassword(
            password,
            hash
          );

        expect(
          matches
        ).toBe(
          true
        );
      }
    );

    it(
      "rejects an incorrect password",
      async () => {
        const hash =
          await hashPassword(
            "SecurePass123"
          );

        const matches =
          await comparePassword(
            "WrongPass123",
            hash
          );

        expect(
          matches
        ).toBe(
          false
        );
      }
    );

    it(
      "creates different hashes for the same password",
      async () => {
        const password =
          "SecurePass123";

        const firstHash =
          await hashPassword(
            password
          );

        const secondHash =
          await hashPassword(
            password
          );

        expect(
          firstHash
        ).not.toBe(
          secondHash
        );

        expect(
          await comparePassword(
            password,
            firstHash
          )
        ).toBe(
          true
        );

        expect(
          await comparePassword(
            password,
            secondHash
          )
        ).toBe(
          true
        );
      }
    );
  }
);
