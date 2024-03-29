import { Keypair, PublicKey } from "@solana/web3.js";

/* These are some keypairs to aid in testing, do not contain any real funds :) */

export const creator = Keypair.fromSecretKey(
  Uint8Array.from([
    136, 236, 33, 18, 182, 95, 247, 68, 222, 24, 52, 82, 89, 43, 240, 149, 74,
    92, 60, 33, 209, 255, 221, 207, 10, 208, 149, 207, 161, 126, 142, 84, 30,
    186, 237, 17, 250, 81, 77, 108, 248, 193, 71, 38, 37, 47, 235, 232, 78, 5,
    99, 29, 96, 144, 16, 122, 12, 2, 99, 12, 168, 193, 78, 156,
  ])
);

export const otherCreators = [
  Keypair.fromSecretKey(
    Uint8Array.from([
      31, 52, 115, 252, 12, 13, 62, 55, 133, 131, 81, 61, 38, 175, 253, 204, 23,
      243, 180, 180, 178, 226, 104, 78, 159, 148, 142, 175, 196, 235, 36, 126,
      152, 221, 121, 167, 51, 182, 58, 234, 217, 94, 189, 11, 99, 3, 16, 247,
      158, 79, 107, 219, 232, 168, 90, 107, 250, 151, 54, 211, 93, 147, 42, 115,
    ])
  ),
  Keypair.fromSecretKey(
    Uint8Array.from([
      245, 26, 149, 17, 60, 172, 218, 154, 22, 153, 234, 38, 117, 77, 135, 114,
      180, 180, 99, 108, 124, 53, 138, 68, 214, 24, 10, 177, 230, 82, 179, 180,
      199, 61, 211, 236, 239, 118, 196, 83, 37, 232, 5, 136, 162, 106, 58, 0,
      58, 111, 99, 165, 124, 118, 227, 215, 69, 169, 194, 248, 101, 52, 206,
      148,
    ])
  ),
];

export const users = [
  Keypair.fromSecretKey(
    Uint8Array.from([
      243, 175, 79, 103, 190, 63, 200, 29, 117, 225, 114, 71, 25, 77, 208, 231,
      64, 95, 33, 108, 135, 1, 92, 86, 133, 198, 34, 155, 45, 157, 162, 101,
      151, 33, 127, 187, 68, 123, 53, 59, 87, 215, 205, 73, 203, 219, 55, 161,
      59, 117, 211, 172, 16, 107, 235, 189, 241, 189, 222, 70, 35, 117, 194,
      222,
    ])
  ),
  Keypair.fromSecretKey(
    Uint8Array.from([
      37, 243, 162, 101, 33, 131, 154, 96, 184, 2, 212, 88, 50, 65, 196, 227,
      247, 29, 181, 93, 178, 186, 166, 255, 239, 12, 105, 13, 19, 67, 220, 106,
      64, 145, 44, 208, 19, 98, 99, 212, 57, 116, 184, 197, 170, 65, 108, 231,
      172, 220, 56, 37, 114, 221, 52, 162, 221, 177, 250, 148, 159, 86, 173, 41,
    ])
  ),
];

const Exhibition = require("../target/idl/exhibition.json");
export let EXHIBITION_PROGRAM_ID = new PublicKey(
  Exhibition["metadata"]["address"]
);

const Shop = require("../target/idl/shop.json");
export let SHOP_PROGRAM_ID = new PublicKey(Shop["metadata"]["address"]);

const Checkout = require("../target/idl/checkout.json");
export let CHECKOUT_PROGRAM_ID = new PublicKey(Checkout["metadata"]["address"]);

const Carnival = require("../target/idl/carnival.json");
export let CARNIVAL_PROGRAM_ID = new PublicKey(Carnival["metadata"]["address"]);

export let APE_URLS: string[] = [
  "https://arweave.net/cDIEJDoklWxqjgGxpO0_usU6EYl3ZhFhS9lr2LRJz3I",
  "https://arweave.net/yqsiQlGL8p5TZu8hUI370TMMBtjBjgnGArH1SqkLfXo",
  "https://arweave.net/BESvWeqSSlfNUm9eXMn-fJft1mUNkCorNXfINk6DR7s",
  "https://arweave.net/3zyXys6kyKorZELCOMRCHkoSyauT0hDc9VH_HnFB4nI",
  "https://arweave.net/6Z-u2HqPkNbdYUJ9nL4WdkYlHD1zTSFXo9x4NbjyuSM",
  "https://arweave.net/UPLsr51N17JZYhxPx0Shjbx3OpdHkIKD9r0z6PAwVP8",
  "https://arweave.net/YofRxhUy4lZ6X-vNBguhf5eOPd5Ht0WaoUDG0S1fzfs",
  "https://arweave.net/3cwTxy19ftOQRuObrrnooJvlg1DfNkKqeQDEnT-B1q8",
  "https://arweave.net/f8kFL2XhIjXvfc4dJtXwjQviUm8nqtykkhhz9YN0FeY",
  "https://arweave.net/gGccMi95oe5Hd6s0iJngQArJIySRjpRGLz8S8ji2VQc",
];

export const APE_URIS: string[] = [
  "https://arweave.net/ayuE7xBDdvfqkT9j-V-FzrcBBC7aTHUNct9wsfnV8jE",
  "https://arweave.net/5-aZJP-LItDbqnqM59dkzL4J0LIfdyIrVW-uoTt2PHo",
  "https://arweave.net/Cp5guEvGUTZajzKy32qumidCv3WzlN6LxIufbDPTT38",
  "https://arweave.net/9phOwlHi5vqF57Xi6H_A6dF37kZjqBU3HvF6ABM9gyU",
  "https://arweave.net/40OcvYXM4FJ_5Jizjl1OMMUIVwvzEObr1s76Lprb7F4",
  "https://arweave.net/swewDCM4wbAATwQk_PssqfrWoeNUOMpeMmJzxV2s6s0",
  "https://arweave.net/9H6Hjvvm5IkYvnCS3Yp4APYhZsjreXQCJlBkrC72f5o",
  "https://arweave.net/0OgNDfMijqJZd41A7HtaqReaHhbBBEfm7NV10LPbyoE",
  "https://arweave.net/aMZnmYNOpevS5HdAMqxfJBfRclaKUMyBh2N7biZUfYo",
  "https://arweave.net/epAJHgBgQLeeKdcpO7pFmbjyNyI5cItWeixCoAjry40",
];

export let BEAR_URLS: string[] = [
  "https://bafybeifomfjtv4nkiddyv5lzl4l6nxjsmxkezhfkr2hlh5xamwnuyxozee.ipfs.nftstorage.link/5276.png?ext=png",
  "https://bafybeihtqlozhmpihmh7ldowdkgb6saiczoj3itanhsj2352bl6kyujovq.ipfs.nftstorage.link/1128.png?ext=png",
  "https://bafybeigjwkkqf2qu7r4ydixzcqkgdnb2ad45n6alqato7wv5imj4x24cbq.ipfs.nftstorage.link/5157.png?ext=png",
  "https://bafybeicdvultga7mkx2hinrtd7wrvvligc6blo4t2um4pordqbazz74ije.ipfs.nftstorage.link/6577.png?ext=png",
  "https://bafybeidgm6evcezjmuakpz72i4kfpn5qpixnu2futifzpmxd2fqhjttj2q.ipfs.nftstorage.link/724.png?ext=png",
  "https://bafybeib27qbsb4sig2oy6ongel2yqbd44pzmo6rmpulpl67msqngokypii.ipfs.nftstorage.link/4838.png?ext=png",
  "https://bafybeidl3dxvlqrfwxxfimv2b3chs65dwx6t2cnozkexqq3gtbfyisk35u.ipfs.nftstorage.link/4333.png?ext=png",
  "https://bafybeietzgnye5brkhuzpittobj2r7nxs7e24mjjvres4yguucpzroy7re.ipfs.nftstorage.link/5906.png?ext=png",
  "https://bafybeiclkq5op3bruannjxnbgfwaxjdbbwp3i6yskcfc43hpedcve4mutu.ipfs.nftstorage.link/9590.png?ext=png",
  "https://bafybeibg22i5f4b3lwpfvl2zrevy7yxw4do5iltosa6vcfne4hftcgzhda.ipfs.nftstorage.link/597.png?ext=png",
  "https://bafybeihds3yzrk4vt6wyhhpxpyisyq2h6nygep6njwesdaeyt3hy5cf4wm.ipfs.nftstorage.link/9563.png?ext=png",
  "https://bafybeidbnpe6wopf66hjnwp45aicc4fw3g4b3w7pd25gpy4zuhf5u7tlsi.ipfs.nftstorage.link/1050.png?ext=png",
];

export const BEAR_URIS: string[] = [
  "https://arweave.net/Lj0SUdTL6Flzw00Bo9P89vnI6Y79EinonDF7zjPnERA",
  "https://arweave.net/RfNHCVZmGDroF49l_YFA23bwxDFouSmK04lX4p9g1FU",
  "https://arweave.net/bGZqdIq98CkXgZVJ_znWoGW7XlTyjPSRy41V1FL3eZ0",
  "https://arweave.net/IVJT90DxvBxvQ87ICrqrSQV6JYClJniWuEbINUmH2Xk",
  "https://arweave.net/u37k-Hw6PleMpLfV-ZjlwDrqi2jgxP-74zwZhw938ro",
  "https://arweave.net/Yh1bgki1x_LztLIFiyiJhKXTtCui9lLuoklvNQ-XBbo",
  "https://arweave.net/9DWbDfTa-C_Yvr-BYQYF_Pux2th_tDUTk_HKj35mqU4",
  "https://arweave.net/0NwvfCaHsjf9V7UT_Mo0aObGGxK5LeHKJfJoShtFyQA",
  "https://arweave.net/T9yErtrLdrTOHh7LbrGQ6H8eX8rEPfAqRW7p72wYtNo",
  "https://arweave.net/_AcJAHd556y9YnmoZozxJGrMcaj6BEUaf54Ys64Z_CQ",
  "https://arweave.net/QT-MMsSD-KV2jQPymdSaXTZ9t9bt6A9W7lHOGFZHK9Y",
  "https://arweave.net/rvHBkB8Hn1gAIfKgSU_foV9Sg9RrzSYNhtvkRt_CE6Y",
];

export let GOD_URLS: string[] = [
  "https://metadata.degods.com/g/4927.png",
  "https://metadata.degods.com/g/1449.png",
  "https://metadata.degods.com/g/7799.png",
  "https://metadata.degods.com/g/5252.png",
  "https://metadata.degods.com/g/6187-dead.png",
  "https://metadata.degods.com/g/6856-dead.png",
  "https://metadata.degods.com/g/828-dead.png",
  "https://metadata.degods.com/g/145.png",
  "https://metadata.degods.com/g/6891.png",
  "https://metadata.degods.com/g/1834-dead.png",
];

export let GOD_URIS: string[] = [
  "https://arweave.net/GH8s-XH1py2aIJeHHJBGWWYvywlLQFcsTef-KzhHmWM",
  "https://arweave.net/WuGWRAuGG7WbDLzPHcg0Rjj_DdgmSCSBtxZ5_v3piQo",
  "https://arweave.net/CTP6_XDl350m8cuKWIzsDeb6GPhwxgwLiT-vXAwxn2U",
  "https://arweave.net/KTwcPB4GDmeSiuaUI_i4Ap_thePYGXHBkIauPRIkgkA",
  "https://arweave.net/tFfaltw4MnfC_Ff13xgFxHyhhPo5dwvVPbzanhdHrCs",
  "https://arweave.net/ZVboTl-6OJrOduf7GYYJLNjSc86o93ATMd5bT4-MkeI",
  "https://arweave.net/3Qf9sFzu3n0eKhW5qnrs1ViCS1XPPx_Ohaz7MWtffM4",
  "https://arweave.net/mcYSftt4VGsYkbhWYwDeyzTMph7uBWrUuewGTGTJx4g",
  "https://arweave.net/ruQjxwC_kNtqTtFIkCbiwaYxpXO4Z16ZTBQnzeoR5TY",
  "https://arweave.net/pnTaFpfYg_cbRGH3imnVWiYryIbfi1NkqsXCimNaw7Y",
];

export let ABC_URLS: string[] = [
  "https://yd3kt3ugck7mc67diregsomy5c6d6eskhtjacaszrohusbdwoa4q.arweave.net/wPap7oYSvsF740RIaTmY6Lw_Eko80gECWYuPSQR2cDk",
  "https://g56lut6krjyycpw7agiuvtqkxymwwmdls62mznwm6dy6zizxkq4q.arweave.net/N3y6T8qKcYE-3wGRSs4KvhlrMGuXtMy2zPDx7KM3VDk",
  "https://rev6vxj3i6d4znel6sslaz5bb5wpwzki4unac3pi27cwxiyhzanq.arweave.net/iSvq3TtHh8y0i_SksGehD2z7ZUjlGgFt6NfFa6MHyBs",
  "https://ykh4a55k4ie6fz2dkwbq254ufrgcbq6qdx5hytxvpkydtbz4joxq.arweave.net/wo_Ad6riCeLnQ1WDDXeULEwgw9Ad-nxO9XqwOYc8S68",
  "https://psisfwvdhk3m44f6cdcfefat3ug3su5fe3arouq2oosssmcbcnla.arweave.net/fJEi2qM6ts5wvhDEUhQT3Q25U6UmwRdSGnOlKTBBE1Y",
  "https://uj63oxppcnml6zzoiuafffu64vj54ftf4fzexlym6rmuoitib4ja.arweave.net/on23Xe8TWL9nLkUAUpae5VPeFmXhckuvDPRZRyJoDxI",
  "https://2b6qbdeqdud33md5nylddjirgpfmf62dqlc4xmhsfdfxuads2elq.arweave.net/0H0AjJAdB72wfW4WMaURM8rC-0OCxcuw8ijLegBy0Rc",
  "https://55pjgmfoz45p23jctwrbwfyjt2yf67noaexysvhb7twssrmwxwiq.arweave.net/716TMK7POv1tIp2iGxcJnrBffa4BL4lU4fztKUWWvZE",
  "https://yzgnbwriqf2iz6fgzqmhdq2z6uk3k2dn6fgqc2xom7tc4xf5rxpa.arweave.net/xkzQ2iiBdIz4pswYccNZ9RW1aG3xTQFq7mfmLly9jd4",
  "https://vnkubxhxqjw3fevmi4hfa7ea5vhfksbv5zscxsesecyoz2zfq4lq.arweave.net/q1VA3PeCbbKSrEcOUHyA7U5VSDXuZCvIkiCw7Oslhxc",
];

export let ABC_URIS: string[] = [
  "https://arweave.net/n1gIJPJGSQEK4ZGVLb7xyqe-sNmoawIYSpnT5VfoZD4",
  "https://arweave.net/EUyl5IddKjrCYW3_vV_1ilSfMRIzGfMFdVY7x1rmmPY",
  "https://arweave.net/_-Tl1vCCO_btke9Z9IfW0FT4UNIC8v_-2OnXwNY7lRU",
  "https://arweave.net/y9IfkMeWtZLSRMm5fSYiD_sQw95HBNe50pV65BcQYX8",
  "https://arweave.net/oGjtzQ_eLmqBdPrR7GoVQtYU16D3iXGz3vCibhmFK7A",
  "https://arweave.net/WsEKbTYnzhyW0SFch75gHRNdxxjgK2s9XZn9n-0A-C4",
  "https://arweave.net/LfyUL3Y4y7c71M7IlMwWr60YDuSs23zyiuX_vwhUP2s",
  "https://arweave.net/0YBzwuEjIUwR-UXXttM0y9d3dsc6tdG1Xyp12NAJieI",
  "https://arweave.net/i28sDlvWNjWIqelcz9gVOWxmst_Xe7Igyp12x6XcedE",
  "https://arweave.net/dwb61GOa03VAFt-TRIl9hFqSE_y3VX-stbfigtjXCd8",
];

export let APE_SYMBOL: string = "APE";
export let BEAR_SYMBOL: string = "BEAR";
export let GOD_SYMBOL: string = "GOD";
export let ABC_SYMBOL: string = "ABC";
