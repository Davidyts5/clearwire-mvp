# How to create Test Accounts for the Demo

To test both the AP Clerk and CFO flows safely in your database, run this exact SQL block in your Supabase SQL Editor.

It will:
1. Create a fake company called "Stark Industries".
2. Create an AP Clerk account (`clerk@stark.com`).
3. Create a CFO account (`cfo@stark.com`).

```sql
-- 1. Create a dummy company for testing
INSERT INTO companies (name) VALUES ('Stark Industries');

-- 2. Create the dummy users in the public users table and link them to Stark Industries
INSERT INTO users (id, company_id, email, full_name, role)
VALUES 
  -- AP Clerk
  ((SELECT id FROM auth.users WHERE email = 'clerk@stark.com'), (SELECT id FROM companies WHERE name = 'Stark Industries' LIMIT 1), 'clerk@stark.com', 'Jane Clerk', 'clerk'),
  
  -- CFO
  ((SELECT id FROM auth.users WHERE email = 'cfo@stark.com'), (SELECT id FROM companies WHERE name = 'Stark Industries' LIMIT 1), 'cfo@stark.com', 'Tony CFO', 'cfo');
```

**IMPORTANT BEFORE RUNNING THE SQL:**
You must first go to the **Authentication** tab in Supabase and manually create these two users with a password you can remember:
* User 1: `clerk@stark.com` (Password: `password123`)
* User 2: `cfo@stark.com` (Password: `password123`)
