use anchor_lang::prelude::*;

// https://medium.com/linum-labs/intro-to-bonding-curves-and-shapes-bf326bc4e11a
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Eq, PartialEq)]
pub enum CurveType {
    Linear,
    Exponential,
}

impl Default for CurveType {
    fn default() -> Self {
        CurveType::Linear
    }
}

// https://medium.com/linum-labs/intro-to-bonding-curves-and-shapes-bf326bc4e11a
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Eq, PartialEq)]
pub enum BoothType {
    BUY,
    SELL,
    TRADE,
}

impl Default for BoothType {
    fn default() -> Self {
        BoothType::TRADE
    }
}
