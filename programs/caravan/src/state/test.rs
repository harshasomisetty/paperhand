#[cfg(test)]
mod tests {
    use std::vec;

    use anchor_lang::{prelude::Pubkey};
    use solana_program::pubkey;

    use crate::state::heap::{Heap, Node};

    // test for additions
    #[test]
    fn handles_price_time_priority_adding_nodes() {
        let mut nft_heap = Heap {
            size: 0,
            items: [Node::default(); 32],
        };

        let mut test_keys = Vec::new();
        let mut test_vals = Vec::new();
        let mut temp_key: Pubkey;

        let num_keys = 5;
        for i in 1..num_keys {
            temp_key = anchor_lang::prelude::Pubkey::new_unique();
            test_keys.push(temp_key);
            test_vals.push(i);
        }

        for i in 0..(num_keys - 1) {
            nft_heap.add(test_vals[i] as u64, test_keys[i]);
        }

        // println!("heap bid: {}", nft_heap.size);

        // println!("HERREEE\n\n\n");
        // println!(
        //     "size {} empty {} max price {}",
        //     nft_heap.size,
        //     nft_heap.is_empty(),
        //     nft_heap.items[0].bid_price
        // );
        // println!("heap? {}", nft_heap);

        assert_eq!(nft_heap.size, (num_keys - 1) as u64);
        assert_eq!(nft_heap.is_empty(), false);
        assert_eq!(
            nft_heap.items[0].bid_price,
            *test_vals.iter().max().unwrap() as u64
        );

        println!("{}",*test_vals.iter().max().unwrap());
        println!("{:?}", test_vals)
    }

    // test for deletions
    #[test]
    fn handles_price_time_priority_deleting_nodes() {
        let mut nft_heap = Heap {
            size: 0,
            items: [Node::default(); 32],
        };

        let mut test_keys_vals:Vec<(Pubkey, usize)> = Vec::new();
        let test_vals: Vec<usize> = vec![5, 5, 10];
        let mut temp_key: Pubkey;

        let num_keys = 3;
        for i in 0..num_keys {
            temp_key = anchor_lang::prelude::Pubkey::new_unique();
            test_keys_vals.push((temp_key, test_vals[i]));
        }

        for i in 0..num_keys {
            nft_heap.add(test_keys_vals[i].1 as u64, test_keys_vals[i].0)
        }
        
        /*
            10 (2)
           /  \
          /    \
        5 (1)   5 (0)
        */

        assert_eq!(nft_heap.size, 3);
        assert_eq!(nft_heap.items[0].sequence_number, 2);
        // should delete the highest node.
        nft_heap.pophighestbid();
        /*
            5 (0)
           /  \
          /    \
        5 (1)   Node::Default
        */

        assert_eq!(nft_heap.items[0].sequence_number, 0);
        assert_eq!(nft_heap.items[1].sequence_number, 1)
    }

    #[test]
    fn test_highest_bid_deletion() {
        let mut nft_heap = Heap {
            size: 0,
            items: [Node::default(); 32],
        };

        let mut test_keys_vals:Vec<(Pubkey, usize)> = Vec::new();
        let test_vals = vec![12, 9, 16, 12];

        let mut temp_key: Pubkey;

        let num_keys = 4;
        for i in 0..num_keys {
            temp_key = anchor_lang::prelude::Pubkey::new_unique();
            test_keys_vals.push((temp_key, test_vals[i]));
        }

        for i in 0..num_keys {
            nft_heap.add(test_keys_vals[i].1 as u64, test_keys_vals[i].0)
        }

        /*
            16 (2)
             /  \
            /    \
        12 (3)   12 (0)
          /
        9 (1)
        */

        assert_eq!(nft_heap.items[0].sequence_number, 2);
        assert_eq!(nft_heap.items[1].sequence_number, 3);
        assert_eq!(nft_heap.items[2].sequence_number, 0);
        assert_eq!(nft_heap.items[3].sequence_number, 1);

        assert_eq!(nft_heap.size, 4);

        nft_heap.pophighestbid();

        /*
            12 (0)
             /  \
            /    \
        12 (3)   9 (1)
        */

        assert_eq!(nft_heap.size, 3);

        assert_eq!(nft_heap.items[0].sequence_number, 0);
        assert_eq!(nft_heap.items[1].sequence_number, 3);
        assert_eq!(nft_heap.items[2].sequence_number, 1);

        nft_heap.pophighestbid();
        /*
            12 (3)
             /
            /
        9 (1)
        */
        assert_eq!(nft_heap.items[0].sequence_number, 3);
        assert_eq!(nft_heap.items[1].sequence_number, 1);
    }

    #[test]
    fn cancel_one_bid() {

        // need to know exactly what the keys are here. 
        let mut nft_heap = Heap {
            size: 0,
            items: [Node::default(); 32],
        };

        let mut test_keys = Vec::new();
        let test_vals = vec![5, 5, 10, 4, 3, 2, 2, 3];
        let mut temp_key: Pubkey;

        let num_keys = 8;

        // Need this step to keep track of keys
        for _i in 0..num_keys {
            temp_key = anchor_lang::prelude::Pubkey::new_unique();
            test_keys.push(temp_key);
        }

        for i in 0..num_keys {
            nft_heap.add(test_vals[i], test_keys[i])
        }

        /*
             Schematic:

                    10(2)
                   /   \
                  /     \
              5(1)       5(0)
             /  \       /   \
            /    \     /     \
          4(3)  3(4)  2(5)    2(6)
          /
         /
        3(7)

          */

        /*
        Now we want to cancel the 5(1) bid -> let's use our cancelbid function to do this
        */
        nft_heap.cancelnftbid(test_keys[1]);

        /*
           Schematic:

                  10(2)
                 /   \
                /     \
            4(3)       5(0)
           /  \       /   \
          /    \     /     \
        3(7)  3(4)  2(5)    2(6)

        */

        assert_eq!(nft_heap.items[0].sequence_number, 2);
        assert_eq!(nft_heap.items[1].sequence_number, 3);
        assert_eq!(nft_heap.items[2].sequence_number, 0);
        assert_eq!(nft_heap.items[3].sequence_number, 7);
        assert_eq!(nft_heap.items[4].sequence_number, 4);
        assert_eq!(nft_heap.items[5].sequence_number, 5);
        assert_eq!(nft_heap.items[6].sequence_number, 6);
    }

    #[test]
    fn cancel_multiple_bids() {
        let mut nft_heap = Heap {
            size: 0,
            items: [Node::default(); 32],
        };

        let mut test_keys = Vec::new();
        let test_vals = vec![5, 5, 10, 4, 3, 2, 2, 3];
        let mut temp_key: Pubkey;

        let num_keys = 8;

        // Need this step to keep track of keys
        for _i in 0..num_keys {
            temp_key = anchor_lang::prelude::Pubkey::new_unique();
            test_keys.push(temp_key);
        }

        for i in 0..num_keys {
            nft_heap.add(test_vals[i], test_keys[i])
        }

        /*
             Schematic:

                    10 (2)
                   /   \
                  /     \
              5(1)       5(0)
             /  \       /   \
            /    \     /     \
          4(3)  3(4)  2(5)    2(6)
          /
         /
        3(7)

          */

        assert_eq!(nft_heap.items[0].sequence_number, 2);
        assert_eq!(nft_heap.items[1].sequence_number, 1);
        assert_eq!(nft_heap.items[2].sequence_number, 0);
        assert_eq!(nft_heap.items[3].sequence_number, 3);
        assert_eq!(nft_heap.items[4].sequence_number, 4);
        assert_eq!(nft_heap.items[5].sequence_number, 5);
        assert_eq!(nft_heap.items[6].sequence_number, 6);
        assert_eq!(nft_heap.items[7].sequence_number, 7);

        nft_heap.cancelnftbid(test_keys[2]);
        assert_eq!(nft_heap.size, 7);
        assert_eq!(nft_heap.items[0].sequence_number, 0);
        assert_eq!(nft_heap.items[1].sequence_number, 1);
        assert_eq!(nft_heap.items[2].sequence_number, 7);
        assert_eq!(nft_heap.items[3].sequence_number, 3);
        assert_eq!(nft_heap.items[4].sequence_number, 4);
        assert_eq!(nft_heap.items[5].sequence_number, 5);
        assert_eq!(nft_heap.items[6].sequence_number, 6);

        /*
           Schematic:

                  5 (0)
                 /   \
                /     \
            5(1)       3(7)
           /  \       /   \
          /    \     /     \
        4(3)  3(4)  2(5)    2(6)

        */

        nft_heap.cancelnftbid(test_keys[3]);
        assert_eq!(nft_heap.size, 6);
        assert_eq!(nft_heap.items[0].sequence_number, 0);
        assert_eq!(nft_heap.items[1].sequence_number, 1);
        assert_eq!(nft_heap.items[2].sequence_number, 7);
        assert_eq!(nft_heap.items[3].sequence_number, 6);
        assert_eq!(nft_heap.items[4].sequence_number, 4);
        assert_eq!(nft_heap.items[5].sequence_number, 5);
        /*
           Schematic:

                  5 (0)
                 /   \
                /     \
            5(1)       3(7)
           /  \       /
          /    \     /
        2(6)  3(4)  2(5)

        */

        nft_heap.cancelnftbid(test_keys[4]);
        assert_eq!(nft_heap.size, 5);
        assert_eq!(nft_heap.items[0].sequence_number, 0);
        assert_eq!(nft_heap.items[1].sequence_number, 1);
        assert_eq!(nft_heap.items[2].sequence_number, 7);
        assert_eq!(nft_heap.items[3].sequence_number, 6);
        assert_eq!(nft_heap.items[4].sequence_number, 5);

        /*
           Schematic:

                  5 (0)
                 /   \
                /     \
            5(1)       3(7)
           /  \
          /    \
        2(6)  3(5)

        */

        nft_heap.cancelnftbid(test_keys[5]);
        assert_eq!(nft_heap.size, 4);
        assert_eq!(nft_heap.items[0].sequence_number, 0);
        assert_eq!(nft_heap.items[1].sequence_number, 1);
        assert_eq!(nft_heap.items[2].sequence_number, 7);
        assert_eq!(nft_heap.items[3].sequence_number, 6);

        /*
           Schematic:

                  5 (0)
                 /   \
                /     \
            5(1)       3(7)
           /
          /
        2(6)

        */

        nft_heap.cancelnftbid(test_keys[6]);
        /*
                  5 (0)
                 /   \
                /     \
            5(1)       3(7)

        */
        assert_eq!(nft_heap.items[0].sequence_number, 0);
        assert_eq!(nft_heap.items[1].sequence_number, 1);
        assert_eq!(nft_heap.items[2].sequence_number, 7);
    }

    #[test]
    fn user_with_no_bid() {
        let mut nft_heap = Heap {
            size: 0,
            items: [Node::default(); 32],
        };

        let mut test_keys = Vec::new();
        let test_vals = vec![5, 5, 10, 4, 3, 2, 2, 3];
        let mut temp_key: Pubkey;

        let num_keys = 8;

        // Need this step to keep track of keys
        for _i in 0..num_keys {
            temp_key = anchor_lang::prelude::Pubkey::new_unique();
            test_keys.push(temp_key);
        }

        for i in 0..num_keys {
            nft_heap.add(test_vals[i], test_keys[i])
        }

        let no_bid_user = anchor_lang::prelude::Pubkey::new_unique();

        nft_heap.cancelnftbid(no_bid_user);

    }
}
