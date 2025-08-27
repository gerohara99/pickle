# MongoDB Atlas IP Whitelist Instructions

To fix the connection error for your Heroku app, you need to whitelist Heroku's IP addresses in MongoDB Atlas:

1. Log in to MongoDB Atlas at https://cloud.mongodb.com
2. Select your cluster
3. Click the "Network Access" tab in the left sidebar
4. Click the "Add IP Address" button
5. Choose one of these options:

## Option 1: Allow access from anywhere (easiest but least secure)

- Click "Allow Access From Anywhere"
- This adds 0.0.0.0/0 to your IP whitelist
- Click "Confirm"

## Option 2: Add Heroku's specific IP addresses (more secure)

- You need to add the specific IP addresses that your Heroku app is using
- You can find these by running:
  ```
  heroku run 'curl -s https://api.ipify.org' --app pickle-admin-staging
  ```
- Add each IP address individually

After adding the IP addresses, your Heroku app should be able to connect to MongoDB Atlas.
