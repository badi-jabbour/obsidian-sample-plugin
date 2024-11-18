import { ParentDocType } from "enums/parent-type.enum";
import { requestUrl } from "obsidian";

const CLICKUP_API_TOKEN = "pk_50104448_AJCAGT8H1JONI43WJ5FF8IJGP7TA7D6N";

export async function getSpaces() {
	try {
		const spaces = await requestUrl({
			url: `https://api.clickup.com/api/v2/team/9013035181/space`,
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Authorization: CLICKUP_API_TOKEN,
			},
		});
		return spaces.json.spaces;
	} catch (error) {
		console.error(error);
	}
}

export async function getFolders(spaceId: string) {
	try {
		const folders = await requestUrl({
			url: `https://api.clickup.com/api/v2/space/${spaceId}/folder`,
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Authorization: CLICKUP_API_TOKEN,
			},
		});
		return folders.json.folders;
	} catch (error) {
		console.error(error);
	}
}

export async function getListsInFolder(folderId: string) {
	try {
		const lists = await requestUrl({
			url: `https://api.clickup.com/api/v2/folder/${folderId}/list`,
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Authorization: CLICKUP_API_TOKEN,
			},
		});
		return lists.json.lists;
	} catch (error) {
		console.error(error);
	}
}

export async function getFolderlessLists(spaceId: string) {
	try {
		const lists = await requestUrl({
			url: `https://api.clickup.com/api/v2/space/${spaceId}/list`,
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Authorization: CLICKUP_API_TOKEN,
			},
		});
		return lists.json.lists;
	} catch (error) {
		console.error(error);
	}
}

export async function createDoc(
	parentId: string,
	parentType: ParentDocType,
	title: string,
	content: string
) {
	try {
		// create doc
		const doc = await requestUrl({
			url: `https://api.clickup.com/api/v3/workspaces/9013035181/docs`,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: "pk_50104448_AJCAGT8H1JONI43WJ5FF8IJGP7TA7D6N",
			},
			body: JSON.stringify({
				name: title,
				parent: { id: parentId, type: parentType },
				visibility: "PUBLIC",
				create_page: false,
			}),
		});

		// create new page with content
		await requestUrl({
			url: `https://api.clickup.com/api/v3/workspaces/9013035181/docs/${doc.json.id}/pages`,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: "pk_50104448_AJCAGT8H1JONI43WJ5FF8IJGP7TA7D6N",
			},
			body: JSON.stringify({
				name: title,
				content: content,
				content_format: "text/md",
			}),
		});
	} catch (error) {}
}
