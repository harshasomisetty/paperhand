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

pub fn exhibit_seeds(creators: &Vec<Creator>) -> Vec<&[u8]> {
    let mut signed_creators: Vec<&[u8]> = Vec::new();
    for creator in creators {
        if creator.verified {
            msg!("creator verified: {:?}", &creator.address.to_string());
            signed_creators.push(creator.address.as_ref());
        }
    }
    signed_creators
}
pub fn exhibit_pubkey_verify<'a>(
    exhibit_pubkey: Pubkey,
    creators: &'a Vec<Creator>,
    symbol: &'a String,
    program_id: Pubkey,
) -> Result<bool> {
    let mut seeds = [
        creator_single_seed(creators, 0),
        creator_single_seed(creators, 1),
        creator_single_seed(creators, 2),
        creator_single_seed(creators, 3),
        creator_single_seed(creators, 4),
        b"exhibit",
        symbol.as_ref(),
    ];

    let (pda, bump_seed) = Pubkey::find_program_address(&seeds, &program_id);

    Ok(pda == exhibit_pubkey)
}
