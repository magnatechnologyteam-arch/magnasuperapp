import { ResetPasswordClient } from "./ResetPasswordClient";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return <ResetPasswordClient error={error} />;
}
