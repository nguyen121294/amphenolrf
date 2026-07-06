import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/jwt";

export default async function Index() {
  const session = await getSession();
  
  if (session) {
    redirect("/console");
  } else {
    redirect("/login");
  }
}
