/**
 * Formats user identities (emails or technical IDs) into friendly display labels.
 * Specifically masks 'personal_' IDs used for ghost users.
 */
export function formatIdentity(id: string | null | undefined): string {
  if (!id) return "Personal Contact";
  
  // Clean up prefix from emails if present
  const cleanId = id.startsWith("email:") ? id.split(":")[1] : id;
  
  if (cleanId.startsWith("personal_")) {
    return "Ghost User";
  }
  
  return cleanId;
}
