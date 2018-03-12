v0.0.0
- [x] Added support for users sessions
- [x] Added support for polling
- [x] Poll options are embedded
- [x] Votes are embedded

v0.1.0
- [x] Added support for question/answer
- [x] Poll, questions, and answers have their own schemas
- [x] Stars, bumps, and votes are embedded

v0.2.0
- [x] Added support for threaded discussion
- [x] Discussions, Questions, Answers, and Polls share a schema

v0.3.0
- [x] Shared metadata schema for question, answer and comments
- [x] Metadata schema is threaded
- [x] Votes stored in own collection for quick read access and count is denormalized in metadata
- [x] Stars stored in ref array on User and count is denormalized in metadata

v1.0.0
- [ ] Passport integration
- [ ] React frontend

Misc
- eventual consistency for votes and stars (update ui immediately)
- lock revote after some time and archive post
- use ES6 promises with Mongoose
- validate and sanitize schema inputs
- modularize code and create folder hierarchy
- [x] use hooks for deletes
- search via tags and metadata
