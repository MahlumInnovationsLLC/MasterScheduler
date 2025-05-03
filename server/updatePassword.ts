import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function main() {
  const plainPassword = "Tier4Admin!"; // This will be the new password
  
  try {
    const hashedPassword = await hashPassword(plainPassword);
    console.log("Password hash generated");
    
    // Update the user
    const [user] = await db.update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.email, "colter.mahlum@nomadgcs.com"))
      .returning();
    
    if (user) {
      console.log(`Password updated for user: ${user.email}`);
      console.log(`You can now login with:`);
      console.log(`Email: ${user.email}`);
      console.log(`Password: ${plainPassword}`);
    } else {
      console.log("User not found");
    }
  } catch (error) {
    console.error("Error updating password:", error);
  }
  
  process.exit(0);
}

main();