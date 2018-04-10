const assert = require("assert"),
	session = require('express-session'),
	express = require('express'),
	cors = require('cors'),
	expressDomainMiddleware = require('express-domain-middleware'),
	http = require('http'),
	bodyParser = require('body-parser'),
	path = require('path'),
	methodOverride = require('method-override'),
	crypto = require('crypto'),
	cookieParser = require('cookie-parser'),
	passport = require('passport'),
	TwitterStrategy = require('passport-twitter').Strategy,
	GoogleStrategy = require('passport-google-oauth').OAuth2Strategy,
	base64url = require('b64url');

module.exports = function () {
	this.config.set("project.port", 8080)

	assert(!this.express, "field exists")
	this.express = express();
	this.passport = passport;
	this.express.use(cors());
	this.express.use(expressDomainMiddleware);
	this.express.use(bodyParser.urlencoded({ extended: true, parameterLimit: 5000 }));
	this.express.use(bodyParser.json({ limit: '1mb' }));
	this.express.use(methodOverride());
	this.express.engine('html', require('ejs').renderFile);

	this.express.use(require('express-domain-middleware'));
	this.express.set('view engine', 'ejs');
	this.express.set('views', path.join(__dirname, '../../public/dist'));
	this.express.use(express.static(path.join(__dirname, '../../public/dist')));

	// Configure Passport authenticated session persistence.
	//
	// In order to restore authentication state across HTTP requests, Passport needs
	// to serialize users into and deserialize users out of the session.  In a
	// production-quality application, this would typically be as simple as
	// supplying the user ID when serializing, and querying the user record by ID
	// from the database when deserializing.  However, due to the fact that this
	// example does not have a database, the complete Twitter profile is serialized
	// and deserialized.
	passport.serializeUser(function (user, cb) {
		cb(null, user);
	});

	passport.deserializeUser(function (obj, cb) {
		cb(null, obj);
	});

	this.express.use(cookieParser());
	this.express.use(session({
		secret: process.env.API_SESSION_SECRET,
		resave: false,
		saveUninitialized: true
	}));
	passport.use(new GoogleStrategy({
			clientID: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
			callbackURL: process.env.GOOGLE_CLIENT_CALLBACK
		},
		(token, refreshToken, profile, done) => {
			console.log('GOOGLE USER LOGIN');
			return done(null, {
				profile: profile,
				token: token
			});
		}));
	passport.use(new TwitterStrategy({
			consumerKey: process.env.TWITTER_CONSUMER_KEY,
			consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
			callbackURL: process.env.TWITTER_CALLBACK
		},
		(token, tokenSecret, profile, cb) => {
			console.log('TWITTER USER LOGIN');
			return cb(null, profile);
		}));
	this.express.use(passport.initialize());
	this.express.use(passport.session());

	assert(!this.server, "field exists")
	this.server = http.createServer(this.express);

	this.on("ready", () => {
		this.server.listen(this.config.get("project.port"), (err) => {
			if (err) {
				return console.error("server", err)
			}
			console.info("listening", this.config.get("project.port"));
		});
	});

	return Promise.resolve();
}
