use crate::state::curve::CurveType;

use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;

#[account]
#[derive(Default)]
#[repr(C)]
pub struct Pool {
    pub pool_id: u8,
    pub creator: Pubkey,
    pub sol: u64,
    pub nfts: u64,
    pub curve: CurveType,
    pub delta: u8,
    pub fee: u8,
}

#[constant]
pub const MAX_ARRAY_SIZE: u64 = 32;

#[derive(Default, AnchorDeserialize, AnchorSerialize, Clone, Copy, Debug)]
pub struct Quote {
    pool_id: u8,
    bid: u64,
    ask: u64,
}

#[account]
#[derive(Default)]
#[repr(C)]
pub struct CarnivalAccount {
    pub pool_id_count: u8,
}
