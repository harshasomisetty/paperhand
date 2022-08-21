use anchor_lang::prelude::*;

use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};

use super::curve::CurveType;

#[account]
#[derive(Default)]
#[repr(C)]
pub struct Market {
    pub market_id: u64,
    pub market_owner: Pubkey,
    pub sol: u64,
    pub nfts: u64,
    pub curve: CurveType,
    pub delta: u8,
    pub fee: u8,
}

#[derive(Default, AnchorDeserialize, AnchorSerialize, Clone, Copy, Debug)]
pub struct Quote {
    market_id: u64,
    bid: u64,
    ask: u64,
}

#[account]
#[derive(Default)]
#[repr(C)]
pub struct CarnivalAccount {
    pub market_id_count: u64,
}
