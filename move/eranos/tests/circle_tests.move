#[test_only]
module eranos::circle_tests;

use eranos::circle::{Self, Circle};
use memwal::account::{Self as mw, MemWalAccount};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::test_scenario::{Self as ts, Scenario};

public struct COIN has drop {}

const ST: address = @0xA;
const M1: address = @0x1;
const M2: address = @0x2;
const M3: address = @0x3;
const M4: address = @0x4;
const OUTSIDER: address = @0x99;
const AMT: u64 = 500_000;
const ROUND: u64 = 1_200_000; // 20 minutes

fun key(n: u8): vector<u8> { let mut k = vector[]; let mut i = 0; while (i < 32) { k.push_back(n); i = i + 1; }; k }

/// Stewards create the memory account and the circle.
fun setup(): Scenario {
    let mut s = ts::begin(ST);
    mw::test_share_new_account(ST, s.ctx());
    s.next_tx(ST);
    let mem = s.take_shared<MemWalAccount>();
    circle::create<COIN>(b"demo", &mem, AMT, ROUND, s.ctx());
    ts::return_shared(mem);
    s.next_tx(ST);
    s
}

/// Join one member: memory key first, then admit, as the stewards.
fun join(s: &mut Scenario, m: address, n: u8) {
    s.next_tx(ST);
    let mut mem = s.take_shared<MemWalAccount>();
    let mut c = s.take_shared<Circle<COIN>>();
    mw::test_add_delegate(&mut mem, key(n));
    circle::admit(&mut c, &mem, m, key(n), s.ctx());
    ts::return_shared(mem);
    ts::return_shared(c);
}

fun join_four(s: &mut Scenario) { join(s, M1, 1); join(s, M2, 2); join(s, M3, 3); join(s, M4, 4); }

fun start(s: &mut Scenario, order: vector<address>, at: u64) {
    s.next_tx(ST);
    let mut c = s.take_shared<Circle<COIN>>();
    let mut clk = clock::create_for_testing(s.ctx());
    clk.set_for_testing(at);
    circle::start_cycle(&mut c, order, &clk, s.ctx());
    clk.destroy_for_testing();
    ts::return_shared(c);
}

fun pay_for(s: &mut Scenario, payer: address, member: address, round: u64, amount: u64, at: u64) {
    s.next_tx(payer);
    let mut c = s.take_shared<Circle<COIN>>();
    let mut clk = clock::create_for_testing(s.ctx());
    clk.set_for_testing(at);
    let coin = coin::mint_for_testing<COIN>(amount, s.ctx());
    circle::contribute_for(&mut c, round, member, coin, &clk, s.ctx());
    clk.destroy_for_testing();
    ts::return_shared(c);
}

fun pay(s: &mut Scenario, m: address, round: u64, at: u64) { pay_for(s, m, m, round, AMT, at); }

fun pay_all(s: &mut Scenario, round: u64, at: u64) { pay(s, M1, round, at); pay(s, M2, round, at); pay(s, M3, round, at); pay(s, M4, round, at); }

fun payout(s: &mut Scenario, caller: address, round: u64) {
    s.next_tx(caller);
    let mut c = s.take_shared<Circle<COIN>>();
    circle::payout(&mut c, round, s.ctx());
    ts::return_shared(c);
}

fun order4(): vector<address> { vector[M1, M2, M3, M4] }

#[test]
fun happy_path_full_cycle_pays_only_scheduled_member() {
    let mut s = setup();
    join_four(&mut s);
    start(&mut s, vector[M3, M1, M4, M2], 1000);
    let order = vector[M3, M1, M4, M2];
    let mut r = 0;
    while (r < 4) {
        pay_all(&mut s, r, 1000 + r * ROUND);
        payout(&mut s, @0xBEEF, r); // permissionless caller
        s.next_tx(order[r]);
        let got = s.take_from_sender<Coin<COIN>>();
        assert!(got.value() == 4 * AMT);
        s.return_to_sender(got);
        r = r + 1;
    };
    s.next_tx(ST);
    let c = s.take_shared<Circle<COIN>>();
    assert!(circle::pot_value(&c) == 0);
    assert!(circle::is_between_cycles(&c));
    assert!(circle::cycle(&c) == 1);
    ts::return_shared(c);
    s.end();
}

#[test]
fun late_payment_of_an_opened_round_is_allowed() {
    let mut s = setup();
    join_four(&mut s);
    start(&mut s, order4(), 0);
    pay(&mut s, M1, 0, 2 * ROUND + 5); // round 0 paid while round 2 is current
    s.next_tx(ST);
    let c = s.take_shared<Circle<COIN>>();
    assert!(circle::has_paid(&c, 0, M1));
    ts::return_shared(c);
    s.end();
}

#[test]
fun covering_for_another_member_credits_that_member() {
    let mut s = setup();
    join_four(&mut s);
    start(&mut s, order4(), 0);
    pay_for(&mut s, M2, M1, 0, AMT, 10);
    s.next_tx(ST);
    let c = s.take_shared<Circle<COIN>>();
    assert!(circle::has_paid(&c, 0, M1));
    assert!(!circle::has_paid(&c, 0, M2));
    ts::return_shared(c);
    s.end();
}

#[test]
fun leave_between_cycles_after_key_removed() {
    let mut s = setup();
    join_four(&mut s);
    s.next_tx(ST);
    let mut mem = s.take_shared<MemWalAccount>();
    let mut c = s.take_shared<Circle<COIN>>();
    mw::test_remove_delegate(&mut mem, key(4));
    circle::remove(&mut c, &mem, M4, s.ctx());
    assert!(circle::members(&c).length() == 3);
    assert!(mw::access_counter_version(&mem) == 1);
    ts::return_shared(mem);
    ts::return_shared(c);
    s.end();
}

#[test]
fun second_cycle_after_first_completes() {
    let mut s = setup();
    join_four(&mut s);
    start(&mut s, order4(), 0);
    let mut r = 0;
    while (r < 4) { pay_all(&mut s, r, r * ROUND); payout(&mut s, M1, r); r = r + 1; };
    start(&mut s, vector[M4, M3, M2, M1], 10 * ROUND);
    s.next_tx(ST);
    let c = s.take_shared<Circle<COIN>>();
    assert!(circle::cycle(&c) == 2);
    ts::return_shared(c);
    s.end();
}

#[test, expected_failure(abort_code = circle::ENotStewards)]
fun non_steward_cannot_admit() {
    let mut s = setup();
    s.next_tx(OUTSIDER);
    let mut mem = s.take_shared<MemWalAccount>();
    let mut c = s.take_shared<Circle<COIN>>();
    mw::test_add_delegate(&mut mem, key(1));
    circle::admit(&mut c, &mem, M1, key(1), s.ctx());
    abort 999
}

#[test, expected_failure(abort_code = circle::EMemoryNotGranted)]
fun admit_without_memory_key_is_refused() {
    let mut s = setup();
    s.next_tx(ST);
    let mem = s.take_shared<MemWalAccount>();
    let mut c = s.take_shared<Circle<COIN>>();
    circle::admit(&mut c, &mem, M1, key(1), s.ctx());
    abort 999
}

#[test, expected_failure(abort_code = circle::EMemoryNotRevoked)]
fun remove_while_key_still_present_is_refused() {
    let mut s = setup();
    join_four(&mut s);
    s.next_tx(ST);
    let mem = s.take_shared<MemWalAccount>();
    let mut c = s.take_shared<Circle<COIN>>();
    circle::remove(&mut c, &mem, M4, s.ctx());
    abort 999
}

#[test, expected_failure(abort_code = circle::EAlreadyMember)]
fun duplicate_member_is_refused() {
    let mut s = setup();
    join(&mut s, M1, 1);
    join(&mut s, M1, 1);
    abort 999
}

#[test, expected_failure(abort_code = circle::ECircleFull)]
fun twentieth_member_is_refused() {
    let mut s = setup();
    let mut i: u8 = 1;
    while (i <= 20) { join(&mut s, sui::address::from_u256((i as u256) + 100), i); i = i + 1; };
    abort 999
}

#[test, expected_failure(abort_code = circle::ENotBetweenCycles)]
fun admit_mid_cycle_is_refused() {
    let mut s = setup();
    join_four(&mut s);
    start(&mut s, order4(), 0);
    join(&mut s, @0x5, 5);
    abort 999
}

#[test, expected_failure(abort_code = circle::ENotBetweenCycles)]
fun leave_mid_cycle_is_refused() {
    let mut s = setup();
    join_four(&mut s);
    start(&mut s, order4(), 0);
    s.next_tx(ST);
    let mut mem = s.take_shared<MemWalAccount>();
    let mut c = s.take_shared<Circle<COIN>>();
    mw::test_remove_delegate(&mut mem, key(4));
    circle::remove(&mut c, &mem, M4, s.ctx());
    abort 999
}

#[test, expected_failure(abort_code = circle::EOrderMismatch)]
fun order_that_is_not_a_permutation_is_refused() {
    let mut s = setup();
    join_four(&mut s);
    start(&mut s, vector[M1, M1, M3, M4], 0);
    abort 999
}

#[test, expected_failure(abort_code = circle::ENotStewards)]
fun non_steward_cannot_start_cycle() {
    let mut s = setup();
    join_four(&mut s);
    s.next_tx(OUTSIDER);
    let mut c = s.take_shared<Circle<COIN>>();
    let clk = clock::create_for_testing(s.ctx());
    circle::start_cycle(&mut c, order4(), &clk, s.ctx());
    abort 999
}

#[test, expected_failure(abort_code = circle::ENotMember)]
fun non_member_cannot_contribute() {
    let mut s = setup();
    join_four(&mut s);
    start(&mut s, order4(), 0);
    pay(&mut s, OUTSIDER, 0, 10);
    abort 999
}

#[test, expected_failure(abort_code = circle::EWrongRound)]
fun future_round_cannot_be_prepaid() {
    let mut s = setup();
    join_four(&mut s);
    start(&mut s, order4(), 0);
    pay(&mut s, M1, 1, 10);
    abort 999
}

#[test, expected_failure(abort_code = circle::EAlreadyPaid)]
fun double_pay_is_refused() {
    let mut s = setup();
    join_four(&mut s);
    start(&mut s, order4(), 0);
    pay(&mut s, M1, 0, 10);
    pay(&mut s, M1, 0, 20);
    abort 999
}

#[test, expected_failure(abort_code = circle::EWrongAmount)]
fun wrong_amount_is_refused() {
    let mut s = setup();
    join_four(&mut s);
    start(&mut s, order4(), 0);
    pay_for(&mut s, M1, M1, 0, AMT - 1, 10);
    abort 999
}

#[test, expected_failure(abort_code = circle::ERoundNotOpen)]
fun contribute_before_any_cycle_is_refused() {
    let mut s = setup();
    join_four(&mut s);
    pay(&mut s, M1, 0, 10);
    abort 999
}

#[test, expected_failure(abort_code = circle::ERoundNotFull)]
fun payout_before_round_is_full_is_refused() {
    let mut s = setup();
    join_four(&mut s);
    start(&mut s, order4(), 0);
    pay(&mut s, M1, 0, 10);
    pay(&mut s, M2, 0, 10);
    pay(&mut s, M3, 0, 10);
    payout(&mut s, M1, 0);
    abort 999
}

#[test, expected_failure(abort_code = circle::EAlreadyPaidOut)]
fun double_payout_is_refused() {
    let mut s = setup();
    join_four(&mut s);
    start(&mut s, order4(), 0);
    pay_all(&mut s, 0, 10);
    payout(&mut s, M1, 0);
    payout(&mut s, M1, 0);
    abort 999
}

#[test, expected_failure(abort_code = circle::EWrongRound)]
fun payout_for_nonexistent_round_is_refused() {
    let mut s = setup();
    join_four(&mut s);
    start(&mut s, order4(), 0);
    payout(&mut s, M1, 9);
    abort 999
}

#[test, expected_failure(abort_code = circle::EMemoryAccountMismatch)]
fun circle_must_be_created_by_the_memory_account_owner() {
    let mut s = ts::begin(ST);
    mw::test_share_new_account(ST, s.ctx());
    s.next_tx(OUTSIDER);
    let mem = s.take_shared<MemWalAccount>();
    circle::create<COIN>(b"x", &mem, AMT, ROUND, s.ctx());
    abort 999
}

#[test, expected_failure(abort_code = circle::ENoMembers)]
fun cannot_start_a_cycle_without_members() {
    let mut s = setup();
    start(&mut s, vector[], 0);
    abort 999
}
