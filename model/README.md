# Teachable Machine Model

The app is wired for a Google Teachable Machine image model, but it starts in mock mode while `MODEL_URL` is empty in `js/config.js`.

Expected classes:

1. `no_card`
2. `persona_job_seeker`
3. `persona_student`
4. `persona_professional`
5. `persona_returning`
6. `persona_employer`
7. `job_plumber`
8. `job_electrician`
9. `job_carpenter`
10. `job_catering`
11. `job_healthcare`
12. `job_it`
13. `job_admin`
14. `job_driver`
15. `condition_flexible`
16. `condition_parttime`
17. `condition_fulltime`
18. `condition_remote`
19. `situation_no_experience`
20. `situation_training`
21. `situation_change`

Train with varied lighting, distances, angles, and real stall background conditions. Export as TensorFlow.js and paste the hosted model URL into `MODEL_URL`.
