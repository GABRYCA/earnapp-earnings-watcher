const { log, getOld, getNew, bytesToSize } = require("./util.js");

module.exports = async (client, postman) => {

    function saveData(traffic, earnings){
        const mysql = require('mysql');
        const mysql_config = require("../mysql-db.json");

        if (!mysql_config.enabled){
            return;
        }

        const con = mysql.createConnection({
            host: mysql_config.host,
            user: mysql_config.user,
            password: mysql_config.password,
            database: mysql_config.database
        });

        con.connect(function(err) {
            if (err) {
                throw err;
            }
            console.log("Connected with success!");

            con.query("CREATE DATABASE IF NOT EXISTS earnapp_anonymousgca", function (err, result){
               if (err){
                   throw err;
               }
               console.log("If database didn't exists, it got created now with success! [" + result + "]");
            });

            con.query("CREATE TABLE IF NOT EXISTS earnings (time datetime, traffic double, earnings double)", function (err, result){
               if (err){
                   throw err;
               }
               console.log("If table didn't exists, it got created now with success! [" + result + "]");
            });

            // Add data.
            var sql = "INSERT INTO earnings (time, traffic, earnings) VALUES (?,?,?)";
            var items = [new Date(), traffic, earnings];
            con.query(sql, items, function (err, result) {
                if (err) {
                    throw err;
                }
                console.log("Data uploaded to DB with success! [" + result + "]");
            });
        });
    }

    const embed = {
        title: "EarnApp gains report",
        thumbnail: {
            url: "https://earnapp.com/wp-content/uploads/2020/09/favicon-1.png",
        },
        fields: [],
        footer: {
            text: "EarnApp Earnings Watcher © LockBlock-dev",
        },
    };

    const oldEarnings = getOld("devices");
    const oldStats = getOld("stats");
    const newEarnings = await getNew(client, "devices");
    const newStats = await getNew(client, "stats");

    let difference = newStats.balance - oldStats.balance;
    let active = newEarnings.filter((device) => device.earned > 0);
    let oldTraffic = 0;
    let newTraffic = 0;
    let activeWinCount = 0;
    let activeLinuxCount = 0;
    let winCount = 0;
    let linuxCount = 0;


    oldEarnings.filter((device) => device.earned > 0).forEach((device) => (oldTraffic += device.bw));
    active.forEach((device) => {
        newTraffic += device.bw;
        if (device.uuid.includes("win")) activeWinCount += 1;
        if (device.uuid.includes("node")) activeLinuxCount += 1;
    });
    newEarnings.forEach((device) => {
        if (device.uuid.includes("win")) winCount += 1;
        if (device.uuid.includes("node")) linuxCount += 1;
    });

    saveData(bytesToSize((newTraffic - oldTraffic).toFixed(1)), difference.toFixed(2))

    const bottom = () => {
        if (newStats.redeem_details) {
            embed.fields.push({
                name: "Payment method",
                value: newStats.redeem_details.payment_method,
            });
        }

        embed.fields.push(
            {
                name: "Active devices",
                value: `${active.length} devices | ${activeWinCount} windows | ${activeLinuxCount} linux`,
            },
            {
                name: "Total devices",
                value: `${newEarnings.length} devices | ${winCount} windows | ${linuxCount} linux`,
            }
        );
    };

    if (difference > 0) {
        embed.color = 0x00bb6e;
        embed.description = "Balance update";
        embed.fields.push(
            {
                name: "Earned",
                value: `+ ${difference.toFixed(2)}$`,
                inline: true,
            },
            {
                name: "Referrals bonus",
                value: `+ ${(newStats.ref_bonuses - oldStats.ref_bonuses).toFixed(2)}$`,
                inline: true,
            },
            {
                name: "Promotions bonus",
                value: `+ ${(newStats.promo_bonuses - oldStats.promo_bonuses).toFixed(2)}$`,
                inline: true,
            },
            {
                name: "Traffic",
                value: `+ ${bytesToSize((newTraffic - oldTraffic).toFixed(1))}`,
                inline: true,
            },
            {
                name: "Balance",
                value: `${newStats.balance}$`,
                inline: true,
            },
            {
                name: "Lifetime balance",
                value: `${newStats.earnings_total}$`,
                inline: true,
            }
        );
        bottom();
    } else if (difference === 0) {
        embed.color = 0xff0101;
        embed.description = "Balance didn't change";
        embed.fields.push(
            {
                name: "Earned",
                value: `+ ${difference}$`,
                inline: true,
            },
            {
                name: "Referrals bonus",
                value: `+ ${(newStats.ref_bonuses - oldStats.ref_bonuses).toFixed(2)}$`,
                inline: true,
            },
            {
                name: "Promotions bonus",
                value: `+ ${(newStats.promo_bonuses - oldStats.promo_bonuses).toFixed(2)}$`,
                inline: true,
            },
            {
                name: "Traffic",
                value: `+ ${bytesToSize(newTraffic - oldTraffic)}`,
                inline: true,
            },
            {
                name: "Balance",
                value: `${newStats.balance}$`,
                inline: true,
            },
            {
                name: "Lifetime balance",
                value: `${newStats.earnings_total}$`,
                inline: true,
            }
        );
        bottom();
    }

    log("Total report sent", "success");
    postman.send(null, [embed]);
};
