function startAnimation() {
  var P = ["\\", "|", "/", "-"];
  var x = 0;
  aniSt = setInterval(function () {
    process.stdout.write("\r" + P[x++]);
    x &= 3;
  }, 250);
}
