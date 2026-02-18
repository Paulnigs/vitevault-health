const mongoose = require('mongoose');

const uri = "mongodb+srv://dbVitevault:vitalhealth@cluster0.1ckbexy.mongodb.net/vitavault?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(uri)
    .then(async () => {
        try {
            console.log("Connected to MongoDB...");
            // Use mongoose.connection.db to access the native driver
            const users = await mongoose.connection.db.collection('users').find({}).toArray();

            console.log("\n--- Registered Accounts ---");
            if (users.length === 0) {
                console.log("No accounts found.");
            } else {
                users.forEach(u => {
                    console.log(`Email: ${u.email.padEnd(30)} | Role: ${u.role.padEnd(10)} | Name: ${u.name}`);
                });
            }
            console.log("---------------------------\n");

        } catch (error) {
            console.error(error);
        } finally {
            await mongoose.disconnect();
        }
    })
    .catch(err => console.error("Connection error:", err));
