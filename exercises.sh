session="05-formatting-branding"
tar -xzf "sessions/${session}/assets/exercises/05a-exercises.tar.gz" -C "./sessions/${session}/exercises_tmp"
(
  mkdir "sessions/${session}/assets/exercises_tmp"
  cd "sessions/${session}/assets/exercises"
  tar -xzf "05-exercises.tar.gz" -C "../exercises_tmp"
)
(
  cd "sessions/${session}/assets/exercises_tmp"
  tar -czf ../exercises/05b-exercises.tar.gz .
)

rm -rf "sessions/${session}/assets/exercises_tmp"
