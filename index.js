require('dotenv').config()
const token = process.env.TOKEN;
const Discord = require("discord.js");
const puppeteer = require("puppeteer");
const client = new Discord.Client({
  intents: [Discord.GatewayIntentBits.Guilds],
});
const userid = process.env.USER_ID;

async function checkFor300k() {
    const storage = require('./storage.json')
    if (storage.sent == true) return;
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.goto(
    process.env.GROUP_URL
  );
  await page.setViewport({ width: 1080, height: 1024 });

  // find the element with the attribute "ng-bind" with the value "library.currentGroup.group.memberCount | abbreviate"
  const element = await page.$x("//span[contains(text(), '" + process.env.GOAL + "')]");

  // wait around one second for the page to load
  await page.waitForTimeout(1000);

  if (element.length > 0) {
    console.log("goal found!");

    // screenshot the area with the element (with some padding)
    const box = await element[0].boundingBox();
    await page.screenshot({
      path: "members.png",
      clip: {
        x: box.x - 185,
        y: box.y - 130,
        width: box.width + 965,
        height: box.height + 170,
      },
    });

    // get the latest user to join the group and screenshot them
    // there is a div with the class "section-content group-members-list" that contains an ul, which contains a list of li's
    // the first li is the latest user to join the group
    const latestUser = await page.$x(
      "//div[@class='section-content group-members-list']/ul/li[1]"
    );
    const latestUserBox = await latestUser[0].boundingBox();
    await page.screenshot({
      path: "latestUser.png",
      clip: {
        x: latestUserBox.x,
        y: latestUserBox.y,
        width: latestUserBox.width,
        height: latestUserBox.height,
      },
    });

    const user = await client.channels.cache.find(userid);
    // send the images to the user
    const embed = new Discord.EmbedBuilder()
        .setTitle("Goal hit!")
        .setDescription("The goal for members has been hit! Here are the screenshots of the moment it happened and the final member to reach this goal. It happened at " + new Date().toLocaleString() + ".")
    
    const attatchment1 = new Discord.AttachmentBuilder('./members.png', 'members.png')
    const attatchment2 = new Discord.AttachmentBuilder('./latestUser.png', 'latestUser.png')
    
    await user.send({ embeds: [embed], files: [attatchment1, attatchment2] })

    storage.sent = true
    require('fs').writeFileSync('./storage.json', JSON.stringify(storage))

  } else {
    console.log("goal not found... checking again in 30 seconds...");
  }
  await browser.close();
}

client.on("ready", () => {
  console.log("logged into discord");
  client.user.setPresence({
    status: "idle",
  })
  // check for 300k+ every 30 seconds
  checkFor300k();
  setInterval(checkFor300k, 30000);
});

client.login(token);
