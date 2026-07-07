/**
 * Credential issuer adapter (Certifier.io in production). Interface + Console stub + env
 * selector. Issuance is idempotent at the service layer; this just abstracts the vendor call.
 */

export interface IssueCredentialInput {
  studentRef: string;
  programKey: string;
  awardName: string;
}

export interface IssuedCredential {
  issuerCredentialId: string;
}

export interface CredentialIssuer {
  issue(input: IssueCredentialInput): Promise<IssuedCredential>;
  revoke(issuerCredentialId: string): Promise<void>;
}

class ConsoleCredentialIssuer implements CredentialIssuer {
  async issue(input: IssueCredentialInput): Promise<IssuedCredential> {
    return { issuerCredentialId: `console-cred-${input.programKey}-${input.studentRef}` };
  }

  async revoke(): Promise<void> {
    // no-op in the console stub
  }
}

export function getCredentialIssuer(): CredentialIssuer {
  const provider = process.env.AGI_UTAH_CREDENTIAL_PROVIDER ?? 'console';
  if (provider === 'console') return new ConsoleCredentialIssuer();
  throw new Error(`Credential provider "${provider}" is not configured yet.`);
}
