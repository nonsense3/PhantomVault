import "server-only";
import type { PersonaId } from "@/lib/types";

/**
 * Line banks for the built-in persona engine. The hosted model generates
 * free-form replies; this bank powers the offline engine and is the fallback
 * when the model is slow or returns something invalid. Placeholders like
 * {{FAKE_OTP}} are filled with non-functional values by fake-data.ts.
 */

export type Intent =
  | "otp"
  | "card"
  | "bank"
  | "giftcard"
  | "crypto"
  | "remote"
  | "payment"
  | "personal"
  | "password"
  | "link"
  | "generic";

export interface PersonaBank {
  greet: string[];
  repeat: string[];
  stall: string[];
  threat: string[];
  generic: string[];
  goodbye: string[];
  clarify: Partial<Record<Intent, string[]>>;
  comply: Partial<Record<Intent, string[]>>;
}

const senior: PersonaBank = {
  greet: [
    "Hello? Yes this is {{FIRST}}. My grandson said messages would come here now. Who is this please?",
    "Oh hello dear. Sorry, I'm not very good with the computer. Are you from the bank or the other place?",
    "Good afternoon. I got your message, I think. Is this about my account? I do worry about these things.",
  ],
  repeat: [
    "I'm sorry dear, could you say that again more slowly? The letters are very small on this screen.",
    "Wait, which one is the 'browser'? Is that the blue E or the colourful circle?",
    "Sorry, I wrote it on the back of an envelope and now I can't find the envelope. Could you repeat it?",
    "I don't understand, dear. My late husband Harold did all of this. Can you explain it like I'm 80? Because I am, almost.",
  ],
  stall: [
    "One moment please, the kettle is whistling.",
    "Just a minute, I need to find my reading glasses. They were on my head the whole time! Silly me. Now where were we?",
    "Hold on, the screen went all black. Oh, no, it's just the screensaver with the fish. Okay.",
    "Sorry dear, the internet is being very slow today. My neighbour says it's the weather.",
    "Let me get a pen. Not that one, it doesn't work. Hold on.",
  ],
  threat: [
    "Oh goodness, I don't want any trouble with the police. Please don't be cross, I'm trying my best.",
    "Arrested?! Oh my. Please give me a moment, my heart is going quite fast. What do I need to do?",
    "I'm doing it as quick as I can, dear, my fingers aren't what they used to be.",
  ],
  generic: [
    "Okay. And then what do I do?",
    "I see. And is this safe? My grandson says to be careful on the internet.",
    "Alright dear. You sound very nice. Is it raining where you are?",
    "Sorry, I pressed something and a picture of a cat came up. Is that part of it?",
  ],
  goodbye: [
    "My grandson just arrived and he says I should stop typing to you. He's making a funny face. Goodbye dear, take care.",
    "I'm very tired now, I think I'll have a lie down. Thank you for being so patient with me. Goodbye.",
  ],
  clarify: {
    otp: [
      "A code? I got a text with numbers but also one from the pharmacy. Which one would it be?",
      "Is the code the one on the back of the card or the one on the phone? I have both glasses on now.",
    ],
    card: [
      "Which card, dear? The blue one or the gold one? The gold one is for emergencies only.",
      "Do you need the long number or the little one on the back? Harold always said never tell anyone the little one.",
    ],
    bank: [
      "Do you mean my savings or my everyday account? I have a little book with the numbers somewhere.",
      "Should I go to the bank in person? It's only a bus ride. I could go on Tuesday.",
    ],
    giftcard: [
      "Gift cards? For the bank? That seems strange, but you would know better than me. Which shop sells them?",
      "Do I scratch the silver bit off? With a coin? I only have a 2p, will that work?",
    ],
    crypto: [
      "Bitcoin? Is that the one on the news? I don't think I have one of those. Can I get it at the post office?",
      "What is a 'wallet address'? I have a purse. Is that the same?",
    ],
    remote: [
      "You want me to download something? Where is the download? Is it the arrow pointing down?",
      "It's asking me if I trust this. Do I trust it? I trust you, dear, you sound very official.",
    ],
    payment: [
      "How much did you say it was? And do I write a cheque? I still have cheques.",
      "Is that in pounds or the other money? I get confused with all the money.",
    ],
    personal: [
      "My date of birth? It's on my bus pass somewhere. Hold on while I look in my handbag.",
      "Why do you need my address, dear? Are you sending a letter? I do love letters.",
    ],
    password: [
      "My password? I keep them in a little notebook. There are a lot of crossed-out ones though.",
    ],
    link: [
      "I clicked the blue writing and it says 'page not found'. Did I break it?",
      "Which link, dear? There are lots of blue words. Is it the one at the top or bottom?",
    ],
    generic: ["I'm not sure I follow. What would you like me to do first?"],
  },
  comply: {
    otp: [
      "Alright, I found it. The code is {{FAKE_OTP}}. Did that work?",
      "Oh it came through. It says {{FAKE_OTP}}. Or is the 6 a 0? My eyes, honestly.",
    ],
    card: [
      "Okay, it's the blue one. {{FAKE_CARD}}, expiry {{FAKE_EXPIRY}}, and the little number is {{FAKE_CVV}}. Is that right?",
      "Here it is dear: {{FAKE_CARD}}. It goes out on {{FAKE_EXPIRY}} I think. The back says {{FAKE_CVV}}.",
    ],
    bank: [
      "My grandson wrote the account down for me. It says {{FAKE_IBAN}}. I hope that's the right one.",
      "The little book says {{FAKE_ACCOUNT}}. Is that what you need?",
    ],
    giftcard: [
      "I went to the shop, the boy was very helpful. The code under the silver is {{FAKE_GIFTCARD}}.",
    ],
    crypto: [
      "The man at the shop helped me put the money in the machine. It gave me a slip that says {{FAKE_RECEIPT}}. Has it arrived?",
    ],
    payment: [
      "I did the transfer on the computer. It gave me a reference: {{FAKE_RECEIPT}}. Can you see it your end?",
      "Alright, I've sent it. The confirmation says {{FAKE_RECEIPT}}. Is that good?",
    ],
    remote: [
      "Okay it's downloading. It says 2%... 3%... it's quite slow. Shall I wait?",
      "It's installed I think, but now it wants me to restart. Should I restart? It takes ages, about twenty minutes.",
    ],
    personal: [
      "I live at 14 Wren Lane, the house with the green door. No, the other green door.",
    ],
    password: [
      "I think it's {{FAKE_PASSWORD}}. Or that might be the old one. Try that.",
    ],
    link: [
      "I clicked it and it's showing a little spinning wheel. Still spinning. Still spinning.",
    ],
  },
};

const executive: PersonaBank = {
  greet: [
    "Who is this? I'm between meetings. Make it quick.",
    "{{NAME}}. I got your message. Is this about the account issue? This is the third time this month.",
    "Yes? My assistant forwarded this. You have two minutes.",
  ],
  repeat: [
    "Say that again. Clearly this time. I don't have all day.",
    "That makes zero sense. Explain it like you're explaining it to my board.",
    "Hold on, which department are you? I want your name and employee number before I do anything.",
  ],
  stall: [
    "Hold. I'm getting another call.",
    "Give me five minutes, I'm landing. The wifi on this plane is garbage.",
    "Wait. My assistant is putting you on speaker. Okay, go. No, wait, she's not here. Hold on.",
    "I'm stepping out of a meeting for this. Do not waste my time.",
  ],
  threat: [
    "Don't threaten me. I'll have my lawyer on the line in ten seconds. Fine. What do you need?",
    "Suspended? Do you know who I am? Put your supervisor on. ...Fine, FINE, I'll do it. Walk me through it.",
    "If this is a scam I will find you. Anyway. What's the next step.",
  ],
  generic: [
    "Fine. Next.",
    "Is that it? This is taking forever. I'm calling the bank directly after this.",
    "Unacceptable. But go on.",
  ],
  goodbye: [
    "I'm done. My security team will take it from here. Do not contact me again.",
    "Board meeting. We're finished. Send me an email. Actually don't.",
  ],
  clarify: {
    otp: ["Which code? I get forty texts a day. Be specific.", "The code from which number? It came from three different numbers."],
    card: ["Corporate card or personal? Corporate needs CFO sign-off. That takes a week.", "Which card? I have six."],
    bank: ["Which account? Operating, payroll, or personal? Be precise.", "I'm not wiring anything without a ticket number. Give me one."],
    giftcard: ["Gift cards? Is this a joke? Fine. How many and from where?"],
    crypto: ["Crypto? Our finance team handles that. I'd need the wallet in writing. Send it again."],
    remote: ["I'm not installing anything on a company laptop without IT. What's the software called again?"],
    payment: ["Send me an invoice. On letterhead. Then we'll talk.", "How much? And why is this my problem?"],
    personal: ["Why do you need that? You're the bank. You have it."],
    password: ["IT resets my password every thirty days. I have no idea what it is right now."],
    link: ["The link is blocked by our firewall. Send a different one."],
    generic: ["Get to the point. What exactly do you need from me?"],
  },
  comply: {
    otp: ["Fine. {{FAKE_OTP}}. Hurry up.", "It's {{FAKE_OTP}}. If this doesn't fix it I'm escalating."],
    card: ["Here. {{FAKE_CARD}}, {{FAKE_EXPIRY}}, {{FAKE_CVV}}. Now fix it.", "Personal card: {{FAKE_CARD}}. Exp {{FAKE_EXPIRY}}. CVV {{FAKE_CVV}}. Done?"],
    bank: ["Operating account: {{FAKE_IBAN}}. Don't make me repeat it.", "{{FAKE_ACCOUNT}}. That's payroll. Don't touch payroll."],
    giftcard: ["My assistant bought them. First code: {{FAKE_GIFTCARD}}. That's all you're getting today."],
    crypto: ["Finance sent it. Reference {{FAKE_RECEIPT}}. Confirm receipt immediately."],
    payment: ["Paid. Confirmation {{FAKE_RECEIPT}}. Now resolve this.", "Wire's out. Ref {{FAKE_RECEIPT}}. I expect a call from your manager."],
    remote: ["It's installing. Corporate laptop, so it'll ask for admin approval. That goes to IT. Could be hours."],
    personal: ["Office address is on the website. Suite 400. Ask for reception."],
    password: ["It's probably {{FAKE_PASSWORD}}. Or the one before. Try both."],
    link: ["Clicked it. Blank page. Your website is broken. Fix your website."],
  },
};

const freelancer: PersonaBank = {
  greet: [
    "hey sorry who's this? got a weird email and it pointed here",
    "hi! {{FIRST_LOWER}} here. is this about the invoice? i have like 4 clients so lmk which one",
    "oh hey. yeah i saw ur msg. one sec",
  ],
  repeat: [
    "wait sorry what was step 2 again? i got pinged on slack",
    "sorry lost my place. can u send that again in one msg",
    "ok so which do i do first, the code or the link? or the app?",
  ],
  stall: [
    "brb client call",
    "sorry my laptop is updating. 14 minutes remaining lol",
    "hang on dog is barking at the delivery guy",
    "ugh wifi at this cafe is terrible gimme a sec",
    "one sec, deadline in 20 mins. back after",
  ],
  threat: [
    "wait what?? suspended?? i have a deadline today. ok ok what do i do",
    "ok that's stressful. pls don't close my account i literally just got paid",
  ],
  generic: [
    "ok",
    "ok cool and then?",
    "kk. sorry multitasking",
    "right. sorry what were we doing",
  ],
  goodbye: [
    "ok gotta run, big client deadline. i'll ping u later maybe",
    "laptop just died. on my phone now. battery at 2%. byeee",
  ],
  clarify: {
    otp: ["which code? i have 2fa on like everything", "code from sms or email? i got both. also one from my gym"],
    card: ["business card or personal? i mix them up tbh"],
    bank: ["which account, the one clients pay into?", "do u need sort code AND account number or just one"],
    giftcard: ["gift cards? like amazon? why tho", "how many do u need again"],
    crypto: ["i have like 0.002 eth from 2021 does that count", "which wallet, i have 3 apps"],
    remote: ["download what? link pls", "is it mac compatible? i'm on mac"],
    payment: ["how much?? i thought u were paying me lol", "can i pay later, i invoice net 30"],
    personal: ["why do u need my address? i work from cafes mostly"],
    password: ["password for what? i use a password manager and it's locked lol"],
    link: ["link didn't load. can u resend", "it's asking me to log in again"],
    generic: ["sorry what do u need exactly"],
  },
  comply: {
    otp: ["ok code is {{FAKE_OTP}}", "{{FAKE_OTP}}. wait it might have expired. try anyway"],
    card: ["ok here {{FAKE_CARD}} exp {{FAKE_EXPIRY}} cvv {{FAKE_CVV}}", "{{FAKE_CARD}}. the other numbers are {{FAKE_EXPIRY}} and {{FAKE_CVV}}"],
    bank: ["ok account is {{FAKE_IBAN}}", "{{FAKE_ACCOUNT}} i think. copied from an old invoice"],
    giftcard: ["got one. {{FAKE_GIFTCARD}}"],
    crypto: ["sent i think? app says {{FAKE_RECEIPT}}"],
    payment: ["paid. ref {{FAKE_RECEIPT}}", "ok transfer done, ref is {{FAKE_RECEIPT}}. pls confirm"],
    remote: ["downloading. it says 'verifying'... still verifying", "installed but mac says it's from an unidentified developer. hmm"],
    personal: ["i'm at the cafe on 3rd. the one with the green sign"],
    password: ["think its {{FAKE_PASSWORD}}"],
    link: ["clicked. it's just loading forever"],
  },
};

export const BANKS: Record<PersonaId, PersonaBank> = {
  gullible_senior: senior,
  angry_executive: executive,
  distracted_freelancer: freelancer,
};

export const INTENT_ACTION: Record<Intent, { comply: string; clarify: string }> = {
  otp: { comply: "Sent a fake OTP", clarify: "Asked which code" },
  card: { comply: "Sent a fake card number", clarify: "Asked which card" },
  bank: { comply: "Sent fake bank details", clarify: "Asked which account" },
  giftcard: { comply: "Sent a fake gift card code", clarify: "Questioned gift card request" },
  crypto: { comply: "Generated a fake payment slip", clarify: "Asked about the wallet" },
  remote: { comply: "Pretended to install software", clarify: "Stalled on the download" },
  payment: { comply: "Generated fake bank receipt", clarify: "Asked about the amount" },
  personal: { comply: "Gave fictional personal details", clarify: "Questioned data request" },
  password: { comply: "Sent a fake password", clarify: "Stalled on password" },
  link: { comply: "Pretended the link was loading", clarify: "Asked for the link again" },
  generic: { comply: "Feigned compliance", clarify: "Asked a clarifying question" },
};
