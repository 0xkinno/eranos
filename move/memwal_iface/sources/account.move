/// Interface stub mirroring the public surface of memwal::account that eranos reads.
/// Signatures match reference/MemWal services/contract/sources/account.move. Test helpers are test_only.
module memwal::account;

use std::string::String;

public struct DelegateKey has copy, drop, store {
    public_key: vector<u8>,
    sui_address: address,
    label: String,
    created_at: u64,
}

public struct MemWalAccount has key, store {
    id: UID,
    owner: address,
    delegate_keys: vector<DelegateKey>,
    created_at: u64,
    active: bool,
    admin_quarantined: bool,
    legacy_account_id: Option<ID>,
    access_counter_version: u64,
}

public fun is_delegate(account: &MemWalAccount, public_key: &vector<u8>): bool {
    let mut i = 0;
    let len = account.delegate_keys.length();
    while (i < len) {
        if (&account.delegate_keys[i].public_key == public_key) return true;
        i = i + 1;
    };
    false
}

public fun owner(account: &MemWalAccount): address { account.owner }
public fun delegate_count(account: &MemWalAccount): u64 { account.delegate_keys.length() }
public fun is_active(account: &MemWalAccount): bool { account.active }
public fun access_counter_version(account: &MemWalAccount): u64 { account.access_counter_version }

#[test_only]
public fun test_share_new_account(owner: address, ctx: &mut TxContext): ID {
    let a = MemWalAccount {
        id: object::new(ctx), owner, delegate_keys: vector[], created_at: 0, active: true,
        admin_quarantined: false, legacy_account_id: option::none(), access_counter_version: 0,
    };
    let id = object::id(&a);
    transfer::share_object(a);
    id
}

#[test_only]
public fun test_add_delegate(a: &mut MemWalAccount, public_key: vector<u8>) {
    a.delegate_keys.push_back(DelegateKey { public_key, sui_address: @0x0, label: b"t".to_string(), created_at: 0 });
}

#[test_only]
public fun test_remove_delegate(a: &mut MemWalAccount, public_key: vector<u8>) {
    let mut i = 0;
    while (i < a.delegate_keys.length()) {
        if (a.delegate_keys[i].public_key == public_key) { a.delegate_keys.remove(i); break };
        i = i + 1;
    };
    a.access_counter_version = a.access_counter_version + 1;
}
