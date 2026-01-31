export type SystemCreateAccountParsedInfo = {
  program: "system";
  programId: string;
  stackHeight?: number;
  parsed: {
    type: "createAccount";
    info: {
      source: string;
      newAccount: string;
      lamports: number;
      space: number;
      owner: string;
    };
  };
};

export function isSystemCreateAccountParsedInstruction(
  ix: unknown,
): ix is SystemCreateAccountParsedInfo {
  if (typeof ix !== "object" || ix === null) return false;
  const candidate = ix as Record<string, any>;

  //Structural validation
  // Checking both program name and type is the standard for "Parsed" instructions
  if (
    candidate.program !== "system" ||
    candidate.parsed?.type !== "createAccount"
  ) {
    return false;
  }

  const info = candidate.parsed.info;

  // Deep property validation
  if (
    !info ||
    typeof info.newAccount !== "string" ||
    typeof info.source !== "string" ||
    typeof info.lamports !== "number"
  ) {
    return false;
  }

  return true;
}
