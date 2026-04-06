#!/usr/bin/env bash

# session="05-formatting-branding"
# tar -xzf "sessions/${session}/assets/exercises/05a-exercises.tar.gz" -C "./sessions/${session}/exercises_tmp"
# (
#   mkdir "sessions/${session}/assets/exercises_tmp"
#   cd "sessions/${session}/assets/exercises"
#   tar -xzf "05-exercises.tar.gz" -C "../exercises_tmp"
# )
# (
#   cd "sessions/${session}/assets/exercises_tmp"
#   tar -czf ../exercises/05b-exercises.tar.gz .
# )

# rm -rf "sessions/${session}/assets/exercises_tmp"

mkdir -p "exercises/01-introduction-setup"
tar -xzf "sessions/01-introduction-setup/assets/exercises/01-exercises.tar.gz" -C "exercises/01-introduction-setup"
mkdir -p "exercises/02-authoring-essentials"
tar -xzf "sessions/02-authoring-essentials/assets/exercises/02-exercises.tar.gz" -C "exercises/02-authoring-essentials"
mkdir -p "exercises/03-embedding-computations-code"
tar -xzf "sessions/03-embedding-computations-code/assets/exercises/03-exercises.tar.gz" -C "exercises/03-embedding-computations-code"
mkdir -p "exercises/04-formats-projects"
tar -xzf "sessions/04-formats-projects/assets/exercises/04-exercises.tar.gz" -C "exercises/04-formats-projects"
mkdir -p "exercises/05-formatting-branding"
tar -xzf "sessions/05-formatting-branding/assets/exercises/05a-exercises.tar.gz" -C "exercises/05-formatting-branding"
mkdir -p "exercises/05-custom-partials"
tar -xzf "sessions/05-formatting-branding/assets/exercises/05b-exercises.tar.gz" -C "exercises/05-custom-partials"
mkdir -p "exercises/05-format-extension"
tar -xzf "sessions/05-formatting-branding/assets/exercises/05c-exercises.tar.gz" -C "exercises/05-format-extension"
mkdir -p "exercises/06-publishing"
tar -xzf "sessions/05-formatting-branding/assets/exercises/05a-exercises.tar.gz" -C "exercises/06-publishing"
