# A savings circle with no collector: what Walrus Memory and Tatum made possible

*Eranos, built for Total Recall. Live on Sui mainnet at https://eranos.vercel.app*

Lucía Herrera is a fictional home-care worker in Houston, and her story is a real pattern. For seven months she paid $200 a month into a ten-person tanda. July was her turn. The woman holding the money stopped answering her phone, and the notebook that said whose turn it was went with her.

Rotating savings circles are called ajo in Lagos, susu in Accra, tanda in Houston, chit in Chennai, pardner in London and equb in Addis Ababa. In ancient Athens they were an *eranos*. They work because people trust each other, and they fail because that trust sits in one person's phone and one person's notebook. We built Eranos so the circle does not need that person.

## What it does

Each member pays their round from their own wallet. A Sui contract pays the pot only to the member whose turn it is, and only when everyone has paid. The circle's memory belongs to the circle: a Walrus Memory account owned by three stewards (any two sign), with one delegate key per member.

Right now the demo circle has 4 members paying 0.1 USDC per round, on 20-minute rounds so you can watch a full cycle. On mainnet so far: 41 verified contributions, 9 payouts, 2 payments made by an agent over x402, and 62 memories on Walrus.

## How it uses Walrus Memory

We treated Walrus Memory as the circle's notebook, not the app's database.

- **The circle owns the account.** The stewards' multisig created it ([2JjtfMth…](https://suiscan.xyz/mainnet/tx/2JjtfMthwAHLCBWBeXPnfJYbti3WVz5wbudb7zZAGY8o)). The keeper and every member are delegates.
- **Money and memory change together.** Joining is one transaction that adds the member's memory key and puts them on the contract's roll ([42Dsi8wX…](https://suiscan.xyz/mainnet/tx/42Dsi8wXBjxUNsQbN4q64BA7Sh7KMXUcZU3zhSeFuoyR)). Our Move contract reads `memwal::account::is_delegate` and refuses to admit anyone without a key. It refuses to remove anyone who still has one. We tried an admit without a key and Sui refused it with abort code 12.
- **Member keys come from wallets.** One signature over a fixed message derives a member's key. It moves no money and is never stored.
- **A guess is not a fact.** Chat text goes through `analyze()` into a `heard` namespace. Only the person a fact is about can sign it into `known`. We pasted "I need the pot early, in round 1" for member 4. While it sat in `heard`, member 4's place in the next order stayed at 3. After they signed, it moved to 1.
- **The memory changes the product.** Members state when money is available to them. The planner sets reminder times from those lines, and late payments move a member later in the next order. Every change cites the memory line that caused it. The landing page has a Memory on and off switch with real data.

## How it uses Tatum

Every Sui read and write goes through the Tatum GraphQL gateway: object reads, event queries, transaction verification by digest, simulation before execution, and execution. The keeper writes a memory line only after Tatum shows the payment on chain. We switched on a fault that makes the keeper believe a member paid. Tatum answered "Transaction not found", the keeper refused, and nothing was written.

The Data API gives local-currency amounts. Tatum counts every call, and if Tatum ever answers with a plan limit, the app says so and reads from the public Sui node instead of failing quietly.

## How it learned over time

Member 2 paid late in rounds 2 and 3 of the first cycle. The keeper recorded the real delay from chain time. With memory off the planner would propose join order. With memory on, member 2 draws later and their second reminder moves earlier, and both changes cite the lines that caused them. The numbers are in [docs/PROOF.md](https://github.com/0xkinno/eranos/blob/main/docs/PROOF.md).

## What we learned, including what did not go well

- The Walrus Memory package and registry IDs in older notes are not the ones the live relayer uses. We read `/config` before creating an account.
- Tatum's address notifications do not support Sui, so a scheduled tick replaces them.
- A Walrus write takes about 20 seconds to confirm. A different delegate could recall that write about 2.6 seconds later in each of our two measurements (we did not run the 30-write study).
- Removing a key is forward only. It does not take back what a member already read, and we say so.

Demo film: https://youtu.be/LDSFkGjC_as

Code: https://github.com/0xkinno/eranos · Proof: https://eranos.vercel.app/proof
