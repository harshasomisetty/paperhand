use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;

// pub mod state;
use crate::state::metaplex_anchor::TokenMetadata;

use mpl_token_metadata::{
    state::{Creator, Data, MAX_MASTER_EDITION_LEN, MAX_METADATA_LEN},
    utils::try_from_slice_checked,
};

// pub fn exhibit_seeds(

// )
pub fn exhibit_pubkey_verify<'a>(
    // exhibit_pubkey: Pubkey,
    creators: &'a Vec<Creator>,
    symbol: &'a String,
    program_id: Pubkey,
) -> (Vec<&'a [u8]>, Pubkey) {
    // msg!("data: {:?}", metadata);
    let mut signed_creators: Vec<&[u8]> = Vec::new();
    msg!("creators: {:?}", &creators);
    for creator in creators {
        if creator.verified {
            msg!("creator verified: {:?}", &creator.address.to_string());
            signed_creators.push(creator.address.as_ref());
        }
    }
    signed_creators.push(b"exhibit");
    signed_creators.push(symbol.as_ref());
    let (pda, bump_seed) = Pubkey::find_program_address(&signed_creators, &program_id);
    msg!("pda: {:?}", pda.to_string());

    // Ok(pda == exhibit_pubkey)
    // Ok(true)
    (signed_creators, pda)
}
