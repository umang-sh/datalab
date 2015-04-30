/*
 * Copyright 2014 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */

/// <reference path="../common/interfaces.d.ts" />
/// <reference path="../../../../../../externs/ts/node/async.d.ts" />
/// <reference path="../../../../../../externs/ts/node/node.d.ts" />
/// <reference path="../../../../../../externs/ts/node/mkdirp.d.ts" />
/// <reference path="../../../../../../externs/ts/node/node-dir.d.ts" />
import async = require('async');
import content = require('./content');
import fs = require('fs');
import mkdirp = require('mkdirp');
import nodedir = require('node-dir');
import pathlib = require('path');

/**
 * Manages storage operations backed by a local file system.
 */
export class LocalFileSystemStorage implements app.IStorage {

  _fsRootPath: string;

  /**
   * Constructor.
   *
   * @param storageRootPath The root path within the local filesystem to use for storage.
   */
  constructor(storageRootPath: string) {
    // Normalize the root path structure.
    this._fsRootPath = pathlib.join(storageRootPath);
  }

  /**
   * Asynchronously deletes the file at the given path.
   *
   * @param path The file system path to write to, relative to the root path.
   * @param callback Callback to invoke upon completion of the write operation.
   */
  delete(path: string, callback: app.Callback<void>) {
    // TODO(bryantd): Add support for deleting directories with emptiness check.
    fs.unlink(this._toFileSystemPath(path), callback);
  }

  /**
   * Asynchronously enumerates the resources that match the given path prefix.
   *
   * @param path The directory path for which to enumerate resources.
   * @param recursive Should the listing operation recursively enumerate sub-directories?
   * @param callback Completion callback to invoke.
   */
  list(path: string, recursive: boolean, callback: app.Callback<app.Resource[]>) {
    // Normalize the listing path (directory) to always have a trailing slash.
    var fsListingDirectoryPath = content.ensureTrailingSlash(this._toFileSystemPath(path));

    // Asynchronously enumerate the files and directories matching the given
    nodedir.paths(fsListingDirectoryPath, (error: Error, paths: NodeDir.Paths) => {
      if (error) {
        callback(error);
        return;
      }

      var resources: app.Resource[] = [];

      // Add file (terminal) resources.
      paths.files.forEach(fsFilepath =>
          resources.push(this._toResource(path, fsFilepath, /* is directory */ false)));

      // Add directory (non-terminal) resources.
      paths.dirs.forEach(fsDirpath =>
          resources.push(this._toResource(path, fsDirpath, /* is directory */ true)));

      // Filter non-notebook resources.
      resources = content.selectNotebooks(resources);

      // Filter to listed directory if non-recursive requested
      resources = content.selectWithinDirectory(
          this._toStoragePath(fsListingDirectoryPath, /* is directory */ true),
          resources,
          recursive);

      // Asynchronously get the last modified time of the files.
      async.map(resources.map(r => this._toFileSystemPath(r.path)), fs.stat, (error, stats) => {
        if (error) {
          callback(error);
          return;
        }

        stats.forEach((stat, i) => {
          // Populate the last modified timestamp for each resource.
          resources[i].lastModified = stat.mtime.toISOString();
        });

        callback(null, resources);
      });
    });
  }

  move(sourcePath: string, destinationPath: string, callback: app.Callback<void>) {
    fs.rename(
        this._toFileSystemPath(sourcePath),
        this._toFileSystemPath(destinationPath),
        callback);
  }

  /**
   * Asynchronously opens and reads from the file at the given path.
   *
   * @param path The file system path to read, relative to the root path.
   * @param callback Callback to invoke upon completion of the read operation.
   */
  read(path: string, callback: app.Callback<string>) {
    fs.readFile(this._toFileSystemPath(path), { encoding: 'utf8' }, (error: any, data: string) => {
      if (error) {
        // An error code of ENOENT indicates that the specified read failed because the file
        // doesn't exist.
        if (error.code == 'ENOENT') {
          // Return as a non-error state, but pass null to indicate the lack of data.
          callback(null, null);
          return;
        } else {
          // Any other error types are surfaced to the caller.
          return callback(error);
        }
      } else {
        // Successful read. Return the data.
        callback(null, data);
        return;
      }
    });
  }

  /**
   * Asynchronously writes the given data string to the file referenced by the given path.
   *
   * @param path The file system path to write to, relative to the root path.
   * @param data The data string to write.
   * @param callback Callback to invoke upon completion of the write operation.
   */
  write(path: string, data: string, callback: app.Callback<void>) {
    fs.writeFile(this._toFileSystemPath(path), data, callback);
  }

  /**
   * Converts the storage path to the corresponding file system path.
   *
   * @param storagePath The storage path.
   * @return The corresponding local filesystem path.
   */
  _toFileSystemPath(storagePath: string) {
    return content.stripTrailingSlash(pathlib.join(this._fsRootPath, storagePath));
  }

  _toResource(
      directoryStoragePath: string,
      resourceFileSystemPath: string,
      isDirectory: boolean
      ): app.Resource {

    var resourceStoragePath = this._toStoragePath(resourceFileSystemPath, isDirectory);
    return {
      path: resourceStoragePath,
      relativePath: content.getRelativePath(directoryStoragePath, resourceStoragePath),
      isDirectory: isDirectory,
      description: content.getDescription(resourceStoragePath),
    };
  }

  /**
   * Converts the file system path to the corresponding storage path.
   *
   * @param fsPath The local filesystem path.
   * @return The corresponding storage path..
   */
  _toStoragePath(fsPath: string, isDirectory: boolean): string {
    // Remove the root storage path prefix and prepend a slash.
    var storagePath = content.ensureLeadingSlash(fsPath.slice(this._fsRootPath.length));
    // Ensure that the path includes a trailing slash if it is a directory.
    if (isDirectory) {
      storagePath = content.ensureTrailingSlash(storagePath);
    }
    return storagePath;
  }
}