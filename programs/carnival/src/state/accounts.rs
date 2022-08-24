use anchor_lang::prelude::*;

use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{Mint, Token, TokenAccount};

use super::curve::{BoothType, CurveType};

#[account]
#[derive(Default)]
#[repr(C)]
pub struct Booth {
    pub booth_id: u64,
    pub booth_owner: Pubkey,

    pub sol: u64,
    pub nfts: u64,

    pub curve: CurveType,
    pub booth_type: BoothType,

    pub spot_price: u64,
    pub delta: u64,
    pub fee: u16,
    pub trade_count: u64,
}

#[derive(Default, AnchorDeserialize, AnchorSerialize, Clone, Copy, Debug)]
pub struct Quote {
    booth_id: u64,
}

#[account]
#[derive(Default)]
#[repr(C)]
pub struct CarnivalAccount {
    pub booth_id_count: u64,
}
