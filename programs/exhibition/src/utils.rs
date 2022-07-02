use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;

// pub mod state;
use crate::state::metaplex_anchor::TokenMetadata;

use mpl_token_metadata::{
    state::{Creator, Data, MAX_MASTER_EDITION_LEN, MAX_METADATA_LEN},
    utils::try_from_slice_checked,
};

pub fn creator_single_seed(creators: &Vec<Creator>, index: usize) -> &[u8] {
    msg!("creators: {:?}", creators);
    if index < creators.len() && creators[index].verified {
        creators[index].address.as_ref()
    } else {
        &[]
    }
}

pub fn exhibit_pubkey_gen<'a>(
    creators: &'a Vec<Creator>,
    symbol: &'a String,
    program_id: Pubkey,
) -> (Pubkey, u8) {
    let seeds = [
        creator_single_seed(creators, 0),
        creator_single_seed(creators, 1),
        creator_single_seed(creators, 2),
        creator_single_seed(creators, 3),
        creator_single_seed(creators, 4),
        b"exhibit",
        symbol.trim_matches(char::from(0)).as_ref(),
    ];

    Pubkey::find_program_address(&seeds, &program_id)
}

pub fn exhibit_pubkey_seeds<'a>(
    exhibit_pubkey: Pubkey,
    creators: &'a Vec<Creator>,
    symbol: &'a String,
    program_id: Pubkey,
    bump_seed: &'a [u8; 1],
) -> [&'a [u8]; 8] {
    [
        creator_single_seed(creators, 0),
        creator_single_seed(creators, 1),
        creator_single_seed(creators, 2),
        creator_single_seed(creators, 3),
        creator_single_seed(creators, 4),
        b"exhibit",
        symbol.trim_matches(char::from(0)).as_ref(),
        bump_seed,
    ]
}

pub fn exhibit_pubkey_verify<'a>(
    exhibit_pubkey: Pubkey,
    creators: &'a Vec<Creator>,
    symbol: &'a String,
    program_id: Pubkey,
) -> Result<bool> {
    let (pda, bump_seed) = exhibit_pubkey_gen(creators, symbol, program_id);
    msg!(
        "pda: {} exhibit: {}, symbol: {}",
        pda.to_string(),
        exhibit_pubkey.to_string(),
        &symbol
    );
    Ok(pda == exhibit_pubkey)
}
