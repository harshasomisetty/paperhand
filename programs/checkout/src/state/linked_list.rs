use anchor_lang::prelude::*;
use std::cmp::PartialEq;
use std::default::Default;
use std::fmt::{self, Debug, Display, Formatter};

#[constant]
pub const MAX_OPEN_ORDERS: usize = 1024;

#[zero_copy]
#[derive(Default, Debug, AnchorSerialize, AnchorDeserialize, PartialEq)]
pub struct Node<T> {
    pub val: T,
    pub prev: usize,
    pub next: usize,
}

// impl<T> Node<T> {
//     fn new(t: T) -> Node<T> {
//         Node {
//             val: t,
//             prev: 0,
//             next: 0,
//         }
//     }
// }

#[zero_copy]
#[derive(Debug, AnchorSerialize, AnchorDeserialize, PartialEq)]
pub struct LinkedList<T> {
    pub free_list_head: usize,
    pub orders: [Node<T>; MAX_OPEN_ORDERS],
}

// impl<T> Default for LinkedList<T> {
//     fn default() -> Self {
//         // Self::<T>::initialize()
//     }
// }

impl<T: std::default::Default> LinkedList<T>
where
    Node<T>: std::marker::Copy,
{
    pub fn initialize() -> Self {
        println!("\n\n\ntesting initialize in linked list\n\n\n");
        // self.free_list_head = 1;
        Self {
            free_list_head: 1,
            orders: [Node::default(); MAX_OPEN_ORDERS],
        }
    }

    pub fn insert_node(&mut self, index: usize, obj: T) {
        self.orders[index].val = obj;
    }

    pub fn remove_node(&mut self) {}
}

impl<T> Display for LinkedList<T>
where
    T: Display + PartialEq + Default + Debug,
{
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        let mut output = Vec::new();

        for order in &self.orders {
            if order.val == Default::default() {
                break;
            }
            output.push(&order.val);
        }
        write!(f, "{:?}", output)
    }
}

#[cfg(test)]
mod tests {

    use super::LinkedList;

    #[test]
    fn insert_node_works() {
        let mut list = LinkedList::<u8>::initialize();
        list.insert_node(0, 1);
        list.insert_node(1, 2);
        list.insert_node(2, 3);
        list.insert_node(3, 4);

        println!("Linked list is {}", list);

        // list.insert_node();
    }
}
