use crate::state::curve::CurveType;

use anchor_lang::solana_program::pubkey::Pubkey;

struct Pool {
    creator: Pubkey,
    sol: u64,
    nfts: u64,
    curve: CurveType,
    delta: u8,
    fee: u8,
}

// bid and ask prices?
// position in bid and ask arrays
