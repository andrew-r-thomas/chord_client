import useWebSocket, { ReadyState } from "react-use-websocket";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { DirectedGraph } from "graphology";
import { SigmaContainer } from "@react-sigma/core";
import "@react-sigma/core/lib/react-sigma.min.css";
import { circular, random } from "graphology-layout";
import forceAtlas2 from "graphology-layout-forceatlas2";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Minus, Plus } from "lucide-react";
import { Slider } from "./ui/slider";
import { Label } from "./ui/label";

type NodeData = {
	addr: string,
	succ: string,
}

type Message = {
	kind: "node data" | "haiku"
	data: NodeData[] | string
	len: number,
}

export const Client = () => {
	let { sendMessage, lastMessage, readyState } = useWebSocket("ws://0.0.0.0:3000/ws");

	const connectionStatus = {
		[ReadyState.CONNECTING]: 'Connecting',
		[ReadyState.OPEN]: 'Open',
		[ReadyState.CLOSING]: 'Closing',
		[ReadyState.CLOSED]: 'Closed',
		[ReadyState.UNINSTANTIATED]: 'Uninstantiated',
	}[readyState];
	const connColor = {
		[ReadyState.CLOSED]: "red-500",
		[ReadyState.OPEN]: "green-500",
		[ReadyState.UNINSTANTIATED]: "slate-500",
		[ReadyState.CONNECTING]: "yellow-500",
		[ReadyState.CLOSING]: "orage-500",
	}[readyState];

	const [graph, _] = useState(new DirectedGraph());
	const [nodeCount, setNodeCount] = useState(0);
	const [nodes, setNodes] = useState(20);
	const [haikus, setHaikus] = useState<string[]>([]);
	const [dataLen, setDataLen] = useState(0);

	useEffect(
		() => {
			if (lastMessage) {
				let n = 0;
				let lastMessageData: Message = JSON.parse(lastMessage?.data);
				if (lastMessageData.kind === "node data") {
					graph.clear();
					for (let node of lastMessageData.data as NodeData[]) {
						graph.mergeNode(node.addr, {
							x: 0,
							y: 0,
							label: node.addr,
							size: 15,
						});
						n += 1;
					}
					for (let node of lastMessageData.data as NodeData[]) {
						if (node.succ.length !== 0) {
							graph.mergeEdge(node.addr, node.succ);
						}
					}
					console.log(lastMessageData.len);
					circular.assign(graph);
					setNodeCount(n);
					setDataLen(lastMessageData.len);
				} else {
					setHaikus([...haikus, lastMessageData.data as string]);
				}
			}
		}, [lastMessage]
	);

	return (
		<div className="flex p-8 flex-row w-full h-full space-x-8 justify-between">
			<SigmaContainer settings={{ defaultEdgeType: "arrow" }} className="rounded-xl border-2" style={{ background: "inherit", color: "white" }} graph={graph} />
			<div className="flex flex-col space-y-2 border-red-500">
				<Card>
					<CardHeader className="p-4">
						<div className="flex flex-row items-center justify-between">
							<div>
								<CardTitle>Connection</CardTitle>
								<CardDescription>{connectionStatus}</CardDescription>
							</div>
							<span className="relative flex h-3 w-3">
								<span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-${connColor} opacity-75`}></span>
								<span className={`relative inline-flex rounded-full h-3 w-3 bg-${connColor}`}></span>
							</span>
						</div>
					</CardHeader>
				</Card>
				<p>data len: {dataLen}</p>
				<p>node count: {nodeCount}</p>
				<div className="flex w-full items-center justify-between flex-row space-x-4">
					<Label>{nodes}</Label>
					<Slider onValueChange={(n) => setNodes(n[0])} defaultValue={[20]} min={1} max={50} step={1} />
				</div>
				<Button onClick={() => sendMessage(JSON.stringify({ "Start": { nodes: nodes } }))} disabled={readyState !== ReadyState.OPEN}>send start message</Button>
			</div>
		</div>
	)

};

