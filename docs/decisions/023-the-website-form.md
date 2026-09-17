# 023 — The website's contact form writes to our database, not to an inbox

**17 September 2026.** Decided with the owner, in his words: _"let the contact form data land in
supabase. I will check with you/supabase once a while for incoming messages and respond."_

## What was asked for

`saafarsaathi.in` had two ways to reach us — a `wa.me` link and a `mailto:` — and one line that
read _"A question, a suggestion, or something wrong in the app"_. The owner wanted the apology
taken out of that sentence and a real form put in: name, phone with an India/UAE code in front of
it, a message, and a send button. Plus a QR for WhatsApp, since a reader on a laptop cannot tap a
`wa.me` link on a machine with no WhatsApp on it.

He also named two audiences the page had never spoken to: **tour operators**, who bring groups
and are exactly who the `OP` coupon prefix exists for, and **cafeteria and food-outlet owners**,
who can put their own kitchen into खाना far more cheaply than we can send a collector to every
street: _"I am thinking of dropping a small business card about our app with the outlets and ask
them to update/load their details on whatsapp… This is cheaper than foot soldiers."_

## The decision

**The form posts to a `contact` edge function, which writes the message into `contact_messages`.
No mail is sent.**

Three paths were on the table and the owner picked the third:

1. **Gmail SMTP with an App Password**, held as a Supabase secret. No new vendor — it is the
   inbox he already reads — but an App Password can send mail as him, which is a larger key than
   the job needs.
2. **Resend**, whose key can do nothing but send. A new account, and its free tier would have
   delivered to his Gmail without touching DNS.
3. **No mail at all.** The message lands in our own database and he reads it — through Claude, in
   the dashboard, and eventually in the admin screen he already intends to build once operator
   traffic justifies one.

**ImprovMX, which already forwards `hello@saafarsaathi.in` to him, cannot do this.** Its free plan
carries mail inward only; outbound SMTP is a paid feature. Reusing it was the first thing asked
and the answer is no — worth writing down so it is not asked a fourth time.

What the third option buys: a message in our own table cannot bounce, cannot expire with an API
key, cannot land in a spam folder, and is already in the place the admin screen will read from.
What it costs: a message sits unread until somebody looks. The owner accepted that explicitly —
he is in this repository most of the day.

## Rules this form does not get to break

- **No IP address anywhere** (decision 011). The throttle — five messages from one number a day —
  counts by the number typed into the form, never by where the request came from.
- **One origin** (decision 012). CORS is `saafarsaathi.in` and `www.saafarsaathi.in`, never `*`.
- **Nothing joins to a traveller.** No device id is read, sent or stored. `contact_messages` has
  no foreign key to `devices`, `passes` or `voice_events`, and nothing in the app writes here.

That last point is the one worth being careful about. Decision 011 says no contact details, and
this table is nothing but contact details — so the distinction has to be real rather than
rhetorical. It is this: the app never collects, and a person who fills in a form volunteers. A
traveller using खाना is not identified by anyone writing in, and somebody writing in is not
thereby findable in the app.

## The honeypot, and why it answers 200

A hidden `company` field, off-screen rather than `display: none` because some fillers skip what is
not laid out. Anything that arrives with it filled is dropped — and answered **200, saved**. A
script told it failed simply tries again with the field empty; a script told it succeeded goes
away.

## बोलना on the page

The same pass added a section for बोलना (decision 020), because it is the one thing in the product
that photographs well: speak a whole sentence in any Indian language, read it back in English,
one tap for Arabic with a read-aloud button.

It carries an awkward sentence on purpose. The whole page promises Dubai **without internet**, and
this one feature needs a signal. Saying so on the page is better than a traveller finding out on a
street in Karama: _"This is the one thing here that asks for a signal. खाना, जाना and जानना work
with the network off; बोलना does not."_
