use anchor_lang::prelude::*;
use anchor_lang::solana_program::pubkey;
use std::cmp::PartialEq;
use std::default::Default;
use std::fmt::{self, Debug, Display, Formatter};
// use std::marker::PhantomData;

#[constant]
pub const MAX_OPEN_ORDERS: u64 = 64;
#[constant]
pub const SENTINEL: u64 = 0;

#[zero_copy]
#[derive(Default, Debug, AnchorSerialize, AnchorDeserialize, PartialEq)]
// pub struct Node<T = Pubkey> {
// pub val: T,
pub struct Node {
    pub val: Pubkey,
    pub prev: u64,
    pub next: u64,
    pub array_index: u64,
}

// impl<T: std::default::Default> LinkedList<T>
// where
//     Node<T>: std::marker::Copy,
// {
//     fn default() -> Self {
//         Self {
//             free_head: 1,
//             order_head: 0,
//             orders: [Node::default(); MAX_OPEN_ORDERS],
//         }
//     }
// }

#[zero_copy]
#[derive(Debug, AnchorSerialize, AnchorDeserialize, PartialEq)]
pub struct LinkedList {
    // pub struct LinkedList<T = Pubkey> {
    // _marker: PhantomData<T>,
    pub free_head: u64,
    pub order_head: u64,
    pub orders: [Node; MAX_OPEN_ORDERS as usize],
}

// impl<T: std::default::Default> LinkedList<T>
// where
//     Node: std::marker::Copy,
impl LinkedList {
    pub fn initialize() -> Self {
        let mut orders = [Node::default(); MAX_OPEN_ORDERS as usize];
        for i in 0..MAX_OPEN_ORDERS as u64 {
            orders[i as usize].array_index = i;
        }

        Self {
            free_head: 1,
            order_head: 0,
            orders,
        }
    }

    // pub fn insert_node(&mut self, obj: T) {
    pub fn insert_node(&mut self, obj: Pubkey) {
        let free_node = &mut self.orders[self.free_head as usize];
        let next_free_node = free_node.next;

        free_node.val = obj;
        free_node.next = self.order_head;
        free_node.prev = SENTINEL;

        if self.order_head != SENTINEL {
            self.orders[self.order_head as usize].prev = self.free_head;
        }
        self.order_head = self.free_head;

        if next_free_node == SENTINEL {
            // Current portion of array is densely packed
            // Next free node is just next index

            assert!(self.free_head + 1 < MAX_OPEN_ORDERS, "Too many open orders");
            self.free_head = self.free_head + 1;
        } else {
            // There are free nodes remaining

            self.free_head = next_free_node;
        }

        println!(
            "List status: free head {}, order head {}",
            self.free_head, self.order_head
        );
        // self.orders[index].val = obj;

        for i in 0..10 {
            msg!(
                "order num {}, {:?}",
                self.orders[i].array_index,
                self.orders[i].val.to_string()
            );
        }
    }

    pub fn remove_node_by_array_index(&mut self, i: u64) {
        let node = &mut self.orders[i as usize];

        let next = node.next;
        let prev = node.prev;

        println!("next {} prev {}", next, prev);
        if prev == SENTINEL {
            println!("removing head");
            // If we enter this block, we are removing the head, so need to stop tracking this
            self.order_head = next;
        }

        node.val = Default::default();
        node.next = self.free_head;
        node.prev = SENTINEL;
        println!("next: {}, prev: {}", &node.next, &node.prev);
        // println!("after node clearing {}", node);

        self.free_head = i;
        self.orders[self.free_head as usize].prev = i;

        // TODO the prev after removing is wrong
        if next != SENTINEL {
            println!("is not tail");
            self.orders[next as usize].prev = prev;
        }
        if prev != SENTINEL {
            println!("is not head");
            self.orders[prev as usize].next = next;
        }

        println!(
            "List status: free head {}, order head {}",
            self.free_head, self.order_head
        );
        for i in 0..10 {
            msg!(
                "order num {}, {:?}",
                self.orders[i].array_index,
                self.orders[i].val.to_string()
            );
        }
    }

    pub fn remove_node_by_pubkey(&mut self, key: Pubkey) {
        let mut cur_node_index = self.order_head;

        while cur_node_index != SENTINEL {
            let cur_node = &self.orders[cur_node_index as usize];

            if cur_node.val == key {
                self.remove_node_by_array_index(cur_node.array_index);
                break;
            }
            cur_node_index = self.orders[cur_node_index as usize].next;
        }
    }
}

// impl<T> Display for LinkedList<T>
// where
// T: Display + PartialEq + Default + Debug,
impl Display for LinkedList {
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        let mut output = Vec::new();

        let mut cur_node_index = self.order_head;

        for i in 0..10 {
            println!("Node: {}", self.orders[i]);
        }
        while cur_node_index != SENTINEL {
            output.push(&self.orders[cur_node_index as usize].val);
            // println!("cur node {}", self.orders[cur_node_index]);
            cur_node_index = self.orders[cur_node_index as usize].next;
            // println!("next? {}", cur_node_index);
        }

        write!(f, "{:?}", output)
    }
}

// impl<T> Display for Node<T>
// where
//     T: Display + PartialEq + Default + Debug,
impl Display for Node {
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        write!(
            f,
            "Node: val {:?} prev {} next {}",
            self.val, self.prev, self.next
        )
    }
}

#[cfg(test)]
mod tests {

    use std::str::FromStr;

    use anchor_lang::prelude::Pubkey;

    use super::LinkedList;

    #[test]
    fn insert_node_works() {
        // let mut list = LinkedList::<u8>::initialize();
        let mut list = LinkedList::initialize();

        let program_id = Pubkey::from_str("G1DCNUQTSGHehwdLCAmRyAG8hf51eCHrLNUqkgGKYASj").unwrap();
        let mut pubkeys = Vec::new();
        for i in 1..5 {
            let (pda, _) = Pubkey::find_program_address(&[&[i as u8]], &program_id);

            pubkeys.push(pda)
        }

        list.insert_node(pubkeys[0]);
        list.insert_node(pubkeys[1]);
        list.insert_node(pubkeys[2]);
        list.insert_node(pubkeys[3]);

        println!("Linked list is \n{}", list);
    }

    // #[test]
    // fn remove_node_works() {
    //     let mut list = LinkedList::initialize();
    //     // list.insert_node(1);
    //     // list.insert_node(2);
    //     // list.insert_node(3);
    //     // list.insert_node(4);
    //     // // println!("Linked list is \n{}\n\n", list);

    //     // list.remove_node_by_index(1);
    //     // list.remove_node_by_index(4);

    //     // // println!("Linked list is \n{}", list);

    //     // list.insert_node(5);
    //     // println!("Linked list is \n{}", list);

    //     // list.insert_node();
    // }
}
