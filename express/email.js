const nodemailer = require('nodemailer');
var handlebars = require('handlebars');
var fs = require('fs');

const authOptions = {
    type: 'oauth2',
    user: 'cannonball2t1@gmail.com',
    clientId: process.env.OAUTH_CLIENT_ID,
    clientSecret: process.env.OAUTH_CLIENT_SECRET,
    refreshToken: process.env.OAUTH_REFRESH_TOKEN,
}

var readHTMLFile = function(path, callback) {
    fs.readFile(path, {encoding: 'utf-8'}, function (err, html) {
        if (err) {
            throw err;
            callback(err);
        }
        else {
            callback(null, html);
        }
    });
};

const getRaffleSelected = (raffle) => {
    // to add a prize, just need to add it to this list AND update in frontend
    const rafflePrizes = {
        "donation": "$200 Donation to Your Choice of Charity",
        "illusionarium": "2 Tickets to the Illusionarium Exhibit ($99+Tax)",
        "bikeshare": "Bike Share Toronto Annual Membership ($99+Tax)",
        "stores": "Engineering Stores Mystery Box of $140 value",
        "steam": "$100 Steam Gift Card",
        "etsy": "$100 Amazon Gift Card",
        "amazon": "$100 Etsy Gift Card",
        "indigo": "$100 Indigo Gift Card",
        "timhortons": "$100 Tim Hortons Gift Card",
        "bookstore": "$100 UofT Bookstore Gift Card",
    }

    const raffleSelected = [];

    Object.keys(raffle).filter((key) => raffle[key] === true).forEach((key) => (
        raffleSelected.push(rafflePrizes[key])
    ))

    return raffleSelected;
}

const getGiftSelected = (gift) => {
    const giftCards = {
        uberEats: 'Uber Eats',
        netflix: 'Netflix',
        apple: 'Apple',
    }

    return giftCards[gift];
}

const sendEmail = (user) => {
    readHTMLFile(
      __dirname + "assets/email_template.html",
      function (err, html) {
        const { email, gift, raffle } = user;

        const raffleSelected = getRaffleSelected(raffle);
        const giftSelected = getGiftSelected(gift)

        console.log(raffleSelected);

        var template = handlebars.compile(html);

        // dynamically replace in html template
        var replacements = {
          giftcard: giftSelected,
          raffle1: raffleSelected[0],
          raffle2: raffleSelected[1],
          raffle3: raffleSelected[2],
        };

        var htmlToSend = template(replacements);

        var mailOptions = {
            from: 'Cannonball 2T1',
            to: email,
            subject: 'Cannonball Ticket',
            html: htmlToSend,
        };

        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: authOptions,
        });

        console.log(`Sending email to ${email}`)

        transporter.sendMail(mailOptions, (err, res) => {
            if (err) {
                console.log(err);
                return false;
            } else {
                console.log(JSON.stringify(res));
                return true;
            }
        });
      }
    );
}

module.exports = {
    sendEmail,
}
