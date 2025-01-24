import { xata } from "@/lib/xata";

async function debugUser() {
  const userId = "810c7cbe-a655-4ede-bed9-0ba6f226f50b";

  console.log("Debugging User Details:");

  // Fetch user details
  const user = await xata.db.nextauth_users.read(userId);
  console.log("User Details:", JSON.stringify(user, null, 2));

  // Check subscriptions
  const subscriptions = await xata.db.subscriptions
    .filter({ user: userId })
    .getAll();
  console.log("User Subscriptions:", JSON.stringify(subscriptions, null, 2));
}

debugUser().catch(console.error);
