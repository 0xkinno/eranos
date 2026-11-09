/// Eranos: a savings circle with no collector.
/// The pot is paid only to order[round]. Money membership and Walrus Memory membership change together or not at all.
module eranos::circle;

use memwal::account::{Self as mw, MemWalAccount};
use sui::balance::{Self, Balance};
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event;
use sui::table::{Self, Table};

// The circle's memory account allows 20 delegate keys: 19 members plus the keeper.
const MAX_MEMBERS: u64 = 19;
const ROUND_KEY_SPAN: u64 = 1000;

const ENotStewards: u64 = 1;
const ENotMember: u64 = 2;
const EWrongRound: u64 = 3;
const EAlreadyPaid: u64 = 4;
const EWrongAmount: u64 = 5;
const ERoundNotFull: u64 = 6;
const EAlreadyPaidOut: u64 = 7;
const ECircleFull: u64 = 8;
const EAlreadyMember: u64 = 9;
const ENotBetweenCycles: u64 = 10;
const EOrderMismatch: u64 = 11;
const EMemoryNotGranted: u64 = 12;
const EMemoryNotRevoked: u64 = 13;
const EMemoryAccountMismatch: u64 = 14;
const ERoundNotOpen: u64 = 15;
const ENoMembers: u64 = 16;

public struct Circle<phantom T> has key {
    id: UID,
    name: vector<u8>,
    stewards: address,
    memory_account: ID,
    contribution: u64,
    round_ms: u64,
    cycle_start_ms: u64,
    members: vector<address>,
    member_keys: Table<address, vector<u8>>,
    order: vector<address>,
    cycle: u64,
    paid: Table<u64, vector<address>>, // key: cycle * 1000 + round
    paid_out: vector<bool>,
    pot: Balance<T>,
}

public struct Contributed has copy, drop { circle: ID, cycle: u64, round: u64, member: address, payer: address, amount: u64 }
public struct PaidOut has copy, drop { circle: ID, cycle: u64, round: u64, to: address, amount: u64 }
public struct Admitted has copy, drop { circle: ID, member: address, key: vector<u8> }
public struct Removed has copy, drop { circle: ID, member: address, key: vector<u8> }
public struct CycleStarted has copy, drop { circle: ID, cycle: u64, order: vector<address>, start_ms: u64 }
public struct CircleCreated has copy, drop { circle: ID, stewards: address, memory_account: ID, contribution: u64, round_ms: u64 }

/// Created by the stewards' multisig address, which must also own the circle's memory account.
public fun create<T>(name: vector<u8>, memory: &MemWalAccount, contribution: u64, round_ms: u64, ctx: &mut TxContext) {
    assert!(mw::owner(memory) == ctx.sender(), EMemoryAccountMismatch);
    assert!(contribution > 0 && round_ms > 0, EWrongAmount);
    let c = Circle<T> {
        id: object::new(ctx),
        name,
        stewards: ctx.sender(),
        memory_account: object::id(memory),
        contribution,
        round_ms,
        cycle_start_ms: 0,
        members: vector[],
        member_keys: table::new(ctx),
        order: vector[],
        cycle: 0,
        paid: table::new(ctx),
        paid_out: vector[],
        pot: balance::zero<T>(),
    };
    event::emit(CircleCreated { circle: object::id(&c), stewards: c.stewards, memory_account: c.memory_account, contribution, round_ms });
    transfer::share_object(c);
}

/// Call in the same PTB, after memwal::account::add_delegate_key. Money only with memory.
public fun admit<T>(c: &mut Circle<T>, memory: &MemWalAccount, member: address, key: vector<u8>, ctx: &TxContext) {
    assert!(ctx.sender() == c.stewards, ENotStewards);
    assert!(object::id(memory) == c.memory_account, EMemoryAccountMismatch);
    assert!(is_between_cycles(c), ENotBetweenCycles);
    assert!(c.members.length() < MAX_MEMBERS, ECircleFull);
    assert!(!c.members.contains(&member), EAlreadyMember);
    assert!(mw::is_delegate(memory, &key), EMemoryNotGranted);
    c.members.push_back(member);
    c.member_keys.add(member, key);
    event::emit(Admitted { circle: object::id(c), member, key });
}

/// Call in the same PTB, after memwal::account::remove_delegate_key. No memory after leaving.
public fun remove<T>(c: &mut Circle<T>, memory: &MemWalAccount, member: address, ctx: &TxContext) {
    assert!(ctx.sender() == c.stewards, ENotStewards);
    assert!(object::id(memory) == c.memory_account, EMemoryAccountMismatch);
    assert!(is_between_cycles(c), ENotBetweenCycles);
    assert!(c.members.contains(&member), ENotMember);
    let key = c.member_keys.remove(member);
    assert!(!mw::is_delegate(memory, &key), EMemoryNotRevoked);
    let (_, i) = c.members.index_of(&member);
    c.members.remove(i);
    event::emit(Removed { circle: object::id(c), member, key });
}

/// Stewards start a cycle with an order that is a permutation of the members.
public fun start_cycle<T>(c: &mut Circle<T>, order: vector<address>, clock: &Clock, ctx: &TxContext) {
    assert!(ctx.sender() == c.stewards, ENotStewards);
    assert!(is_between_cycles(c), ENotBetweenCycles);
    assert!(c.members.length() > 0, ENoMembers);
    assert!(same_set(&order, &c.members), EOrderMismatch);
    c.order = order;
    c.cycle = c.cycle + 1;
    c.cycle_start_ms = clock.timestamp_ms();
    c.paid_out = vector::tabulate!(c.members.length(), |_| false);
    event::emit(CycleStarted { circle: object::id(c), cycle: c.cycle, order: c.order, start_ms: c.cycle_start_ms });
}

/// A member pays their own round.
public fun contribute<T>(c: &mut Circle<T>, round: u64, payment: Coin<T>, clock: &Clock, ctx: &TxContext) {
    contribute_for(c, round, ctx.sender(), payment, clock, ctx)
}

/// Pay a round for `member` (the member, or anyone covering for them). Rounds that have opened can be paid late;
/// future rounds cannot be pre-paid.
public fun contribute_for<T>(c: &mut Circle<T>, round: u64, member: address, payment: Coin<T>, clock: &Clock, ctx: &TxContext) {
    assert!(c.cycle > 0 && !all_paid_out(c), ERoundNotOpen);
    assert!(c.members.contains(&member), ENotMember);
    assert!(round < c.members.length() && round <= current_round(c, clock), EWrongRound);
    assert!(coin::value(&payment) == c.contribution, EWrongAmount);
    let key = c.cycle * ROUND_KEY_SPAN + round;
    if (!c.paid.contains(key)) c.paid.add(key, vector[]);
    let list = &mut c.paid[key];
    assert!(!list.contains(&member), EAlreadyPaid);
    list.push_back(member);
    let amount = coin::value(&payment);
    balance::join(&mut c.pot, coin::into_balance(payment));
    event::emit(Contributed { circle: object::id(c), cycle: c.cycle, round, member, payer: ctx.sender(), amount });
}

/// Permissionless. The pot goes only to order[round]. Nobody can redirect it.
public fun payout<T>(c: &mut Circle<T>, round: u64, ctx: &mut TxContext) {
    assert!(c.cycle > 0 && round < c.members.length(), EWrongRound);
    assert!(!c.paid_out[round], EAlreadyPaidOut);
    let key = c.cycle * ROUND_KEY_SPAN + round;
    assert!(c.paid.contains(key) && c.paid[key].length() == c.members.length(), ERoundNotFull);
    let to = c.order[round];
    let amount = c.contribution * c.members.length();
    let coin = coin::from_balance(balance::split(&mut c.pot, amount), ctx);
    *c.paid_out.borrow_mut(round) = true;
    transfer::public_transfer(coin, to);
    event::emit(PaidOut { circle: object::id(c), cycle: c.cycle, round, to, amount });
}

// ---- reads ----
public fun members<T>(c: &Circle<T>): &vector<address> { &c.members }
public fun order<T>(c: &Circle<T>): &vector<address> { &c.order }
public fun cycle<T>(c: &Circle<T>): u64 { c.cycle }
public fun contribution<T>(c: &Circle<T>): u64 { c.contribution }
public fun pot_value<T>(c: &Circle<T>): u64 { balance::value(&c.pot) }
public fun stewards<T>(c: &Circle<T>): address { c.stewards }
public fun memory_account<T>(c: &Circle<T>): ID { c.memory_account }
public fun has_paid<T>(c: &Circle<T>, round: u64, member: address): bool {
    let key = c.cycle * ROUND_KEY_SPAN + round;
    c.paid.contains(key) && c.paid[key].contains(&member)
}
public fun is_paid_out<T>(c: &Circle<T>, round: u64): bool { c.paid_out[round] }

/// Index of the round currently open, counted from cycle start. May exceed members.length() after the cycle ends.
public fun current_round<T>(c: &Circle<T>, clock: &Clock): u64 {
    (clock.timestamp_ms() - c.cycle_start_ms) / c.round_ms
}

fun all_paid_out<T>(c: &Circle<T>): bool {
    let mut i = 0;
    while (i < c.paid_out.length()) {
        if (!c.paid_out[i]) return false;
        i = i + 1;
    };
    true
}

/// True before the first cycle, and after every round of the current cycle has been paid out.
public fun is_between_cycles<T>(c: &Circle<T>): bool { c.cycle == 0 || all_paid_out(c) }

fun same_set(a: &vector<address>, b: &vector<address>): bool {
    if (a.length() != b.length()) return false;
    let mut i = 0;
    while (i < a.length()) {
        if (!b.contains(&a[i])) return false;
        // no duplicates: a[i] must not appear earlier in a
        let mut j = 0;
        while (j < i) {
            if (a[j] == a[i]) return false;
            j = j + 1;
        };
        i = i + 1;
    };
    true
}
