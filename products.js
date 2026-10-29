/* ===== KOPP SETTINGS: edit this file to run the shop =====
   Add a pair = add one line to `products`. Mark it gone with sold:true.
   Photos: put files in /img and set img:"img/001.jpg" (blank = placeholder shoe).
   `ref` is the internal team tag; it only appears in the WhatsApp order text. */
window.KOPP = {
  whatsapp: "923359189183",          // your number, country code first, no + or spaces
  instagram: "https://www.instagram.com/koppthese",                      // handle without @, blank hides the link
  currency: "Rs",
  shipping: "Pre-Loved. Curated. Restored.",
  products: [  
    {ref:"001", name:"Onistsuka Tiger Corsiar Whtite Green ",    cat:"Sneakers",   size:45, grade:"A+", price:5999, color:"#8A5A3C", img:"img02.jpeg"},
    {ref:"002", name:"Nike Iniator Running",   cat:"Running",    size:42, grade:"A",  price:4499, color:"#3A2A24", img:"img01.jpeg"},
    {ref:"003", name:"Adidas Ultraboost 21",   cat:"Running",  size:43.5, grade:"A",  price:4999, color:"#D9D3C4", img:"img04.jpeg"},
    {ref:"004", name:"Adidas Busenitz Pro 'Halo Silver Gum",    cat:"Sneakers",     size:43.5, grade:"A",  price:4999, color:"#5B3A29", img:"img03.jpeg"},
    {ref:"005", name:"Asics Gel 1090 Piedmont Grey ",  cat:"Jogger",  size:43.5, grade:"B",  price:3900, color:"#2F3A63", img:"img05.jpeg"},
    {ref:"006", name:"New Balance 574 Legacy ",    cat:"Sneakers",   size:42.5, grade:"A+", price:5499, color:"#6B2E2A", img:"img06.jpeg"},
    {ref:"008", name:"On Cloud 5",          cat:"Jogger",  size:45, grade:"A+",  price:5999, color:"#7F8796", img:"img07.jpeg", sold:true}
  ]
};
