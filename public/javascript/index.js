let header = document.getElementById("myheader");
window.onscroll = function() {makeNavbarSticky()};

function makeNavbarSticky() {
    let navbar = document.getElementById("navbar");
    if (window.pageYOffset >= header.offsetTop) {
        navbar.classList.add("sticky");
    } else {
        navbar.classList.remove("sticky");
    }
}