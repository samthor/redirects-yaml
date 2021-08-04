/**
 * Copyright 2021 Sam Thorogood
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * Describes something that can be redirected. Supports `/...` suffixes to catch-all. 
 */
export interface RedirectLine {
  from: string,
  to?: string,
  try?: string | string[],
  else?: string,
}


/**
 * Builds a handler that supports the possible redirections passed. You can pass an optional
 * checker function which can check that the resulting pathname is valid (otherwise falls open).
 */
export function buildHandlers(
  all: RedirectLine[],
  checker?: (pathname: string, original: string) => boolean,
): (url: string) => string|null;
