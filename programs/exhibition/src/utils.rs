use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey::Pubkey;

// pub mod state;
use crate::state::metaplex_adapter::Creator;
use crate::state::metaplex_anchor::TokenMetadata;

pub fn exhibit_pubkey_verify(
    exhibit_pubkey: Pubkey,
    metadata: Account<TokenMetadata>,
    symbol: &String,
    program_id: Pubkey,
) -> Result<bool> {
    let mut signed_creators: Vec<_> = Vec::new();
    let creators = metadata.data.creators.unwrap();
    for creator in &creators {
        if true {
            signed_creators.push(creator.address.as_ref());
        }
    }
    signed_creators.push(symbol.as_ref());
    let (pda, bump_seed) = Pubkey::find_program_address(&signed_creators, &program_id);

    Ok(pda == exhibit_pubkey)
}
